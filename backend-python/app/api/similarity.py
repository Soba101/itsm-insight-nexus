"""Similarity API endpoints."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pgvector.psycopg2 import register_vector
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel, Field, model_validator

from app.core.auth import get_current_user
from app.core.database import get_db_connection
from app.services.embedding import (
	combine_ticket_text,
	generate_embedding,
	get_model_info,
)
from app.services.similarity import find_similar_tickets, get_ticket_family


router = APIRouter(prefix="/api/ai/similarity", tags=["Similarity"])


class EmbeddingRequest(BaseModel):
	short_description: str = Field(..., min_length=1, max_length=1024)
	description: Optional[str] = Field(None, max_length=8000)


class EmbeddingResponse(BaseModel):
	model_name: str
	embedding_dimension: int
	embedding: List[float]


class SimilaritySearchRequest(BaseModel):
	incident_number: Optional[str] = Field(None, min_length=1, max_length=64)
	short_description: Optional[str] = Field(None, min_length=1, max_length=1024)
	description: Optional[str] = Field(None, max_length=8000)
	top_k: int = Field(5, ge=1, le=20)
	min_similarity: float = Field(0.7, ge=0.0, le=1.0)
	model: str = Field("gemma", pattern="^(gemma|qwen3)$")  # Model selection for A/B testing

	@model_validator(mode="after")
	def validate_inputs(self) -> "SimilaritySearchRequest":
		if not (self.incident_number or self.short_description):
			raise ValueError("Provide either incident_number or short_description")
		return self


class SimilarTicket(BaseModel):
	incident_number: str
	short_description: Optional[str]
	description: Optional[str]
	state: Optional[str]
	priority: Optional[str]
	opened_at: Optional[str]
	similarity_score: float
	already_has_parent: bool


class SimilaritySearchResponse(BaseModel):
	model_name: str
	embedding_dimension: int
	query_incident: Optional[str]
	generated_embedding: bool
	results: List[SimilarTicket]


class TicketSummary(BaseModel):
	incident_number: str
	short_description: Optional[str]
	description: Optional[str]
	state: Optional[str]
	priority: Optional[str]
	opened_at: Optional[str]
	parent_incident: Optional[str]
	child_incidents: Optional[List[str]]
	similarity_score: Optional[float]


class TicketFamilyResponse(BaseModel):
	ticket: TicketSummary
	parent: Optional[TicketSummary]
	children: List[TicketSummary]


@router.post("/embed", response_model=EmbeddingResponse, status_code=status.HTTP_200_OK)
async def embed_text(
	payload: EmbeddingRequest,
	user: Dict[str, Any] = Depends(get_current_user),
) -> EmbeddingResponse:
	combined_text = combine_ticket_text(payload.short_description, payload.description)
	embedding = generate_embedding(combined_text)
	info = get_model_info()
	return EmbeddingResponse(
		model_name=info.get("model_name", "unknown"),
		embedding_dimension=len(embedding),
		embedding=embedding,
	)


@router.post("/search", response_model=SimilaritySearchResponse, status_code=status.HTTP_200_OK)
async def search_similar(
	payload: SimilaritySearchRequest,
	user: Dict[str, Any] = Depends(get_current_user),
) -> SimilaritySearchResponse:
	model_info = get_model_info()
	query_embedding: Optional[List[float]] = None
	generated_embedding = False
	
	# Determine which embedding column to use based on model parameter
	embedding_column = "embedding_4096" if payload.model == "qwen3" else "embedding"

	with get_db_connection() as conn:
		register_vector(conn)

		if payload.incident_number:
			cursor = conn.cursor(cursor_factory=RealDictCursor)
			cursor.execute(
				f"""
				SELECT incident_number, short_description, description, {embedding_column}
				FROM servicenow_incidents
				WHERE incident_number = %s
				""",
				(payload.incident_number,),
			)
			ticket_row = cursor.fetchone()
			cursor.close()

			if ticket_row is None:
				raise HTTPException(
					status_code=status.HTTP_404_NOT_FOUND,
					detail="Incident not found",
				)

			stored_embedding = ticket_row.get(embedding_column)
			if stored_embedding is not None:
				query_embedding = [float(value) for value in stored_embedding]
			else:
				combined_text = combine_ticket_text(
					ticket_row.get("short_description") or "",
					ticket_row.get("description"),
				)
				query_embedding = generate_embedding(combined_text)
				generated_embedding = True

				cursor = conn.cursor()
				cursor.execute(
					f"""
					UPDATE servicenow_incidents
					SET {embedding_column} = %s, embedding_model = %s, embedded_at = %s
					WHERE incident_number = %s
					""",
					(
						query_embedding,
						model_info.get("model_name"),
						datetime.utcnow(),
						payload.incident_number,
					),
				)
				cursor.close()
		else:
			combined_text = combine_ticket_text(payload.short_description or "", payload.description)
			query_embedding = generate_embedding(combined_text)
			generated_embedding = True

		results = await find_similar_tickets(
			conn,
			query_embedding,
			top_k=payload.top_k,
			min_similarity=payload.min_similarity,
			exclude_incident=payload.incident_number,
			embedding_column=embedding_column,  # Pass column name to similarity function
		)

	return SimilaritySearchResponse(
		model_name=model_info.get("model_name", "unknown"),
		embedding_dimension=len(query_embedding),
		query_incident=payload.incident_number,
		generated_embedding=generated_embedding,
		results=[SimilarTicket(**ticket) for ticket in results],
	)


@router.get(
	"/tickets/{incident_number}/family",
	response_model=TicketFamilyResponse,
	status_code=status.HTTP_200_OK,
)
async def ticket_family(
	incident_number: str,
	user: Dict[str, Any] = Depends(get_current_user),
) -> TicketFamilyResponse:
	with get_db_connection() as conn:
		family = await get_ticket_family(conn, incident_number)

	if "error" in family:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=family["error"],
		)

	return TicketFamilyResponse(**family)


@router.post("/auto-embed/{incident_number}", status_code=status.HTTP_202_ACCEPTED)
async def auto_embed_ticket(
	incident_number: str,
	user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
	"""
	Automatically generate and store embedding for a ticket.
	Called by database trigger when new tickets are created.
	
	Args:
		incident_number: The incident number to embed
		
	Returns:
		Success message with embedding info
	"""
	with get_db_connection() as conn:
		register_vector(conn)
		cursor = conn.cursor(cursor_factory=RealDictCursor)
		
		# Fetch ticket details
		cursor.execute(
			"""
			SELECT incident_number, short_description, description, 
			       priority, category, embedding
			FROM servicenow_incidents
			WHERE incident_number = %s
			""",
			(incident_number,)
		)
		ticket = cursor.fetchone()
		
		if not ticket:
			cursor.close()
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f"Incident {incident_number} not found"
			)
		
		# Skip if already has embedding
		if ticket['embedding'] is not None:
			cursor.close()
			return {
				"status": "skipped",
				"message": f"Incident {incident_number} already has embedding"
			}
		
		# Generate embedding
		combined_text = combine_ticket_text(
			short_description=ticket.get('short_description'),
			description=ticket.get('description'),
			priority=ticket.get('priority'),
			category=ticket.get('category')
		)
		
		embedding = generate_embedding(combined_text)
		model_info = get_model_info()
		
		# Store embedding
		cursor.execute(
			"""
			UPDATE servicenow_incidents
			SET embedding = %s,
			    embedding_model = %s,
			    embedded_at = NOW()
			WHERE incident_number = %s
			""",
			(embedding, model_info['model_name'], incident_number)
		)
		
		conn.commit()
		cursor.close()
		
		return {
			"status": "success",
			"message": f"Generated and stored embedding for {incident_number}",
			"model": model_info['model_name'],
			"dimension": len(embedding)
		}


