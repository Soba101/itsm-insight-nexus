#!/usr/bin/env python3
"""
Generate Training Pairs for Fine-tuning - Create positive and negative pairs from tickets.

Generates training data using weak supervision:
- Positive pairs: tickets with same category (assumed similar)
- Negative pairs: tickets with different categories (assumed dissimilar)

Output: JSON file with training pairs for contrastive learning.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import json
import random
from collections import defaultdict
from app.core.database import get_db_connection
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_tickets_by_category():
    """
    Fetch all tickets grouped by category.
    Returns dict: {category: [list of tickets]}
    """
    logger.info("Fetching tickets from database...")
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                incident_number,
                category,
                priority,
                short_description,
                description,
                resolution_notes,
                state
            FROM servicenow_incidents
            WHERE category IS NOT NULL
            AND (short_description IS NOT NULL OR description IS NOT NULL)
            ORDER BY category, incident_number
        """)
        
        tickets = cursor.fetchall()
        cursor.close()
    
    logger.info(f"Fetched {len(tickets)} tickets")
    
    # Group by category
    tickets_by_category = defaultdict(list)
    for ticket in tickets:
        incident_number, category, priority, short_desc, desc, resolution, state = ticket
        
        # Combine text fields
        text_parts = []
        if short_desc:
            text_parts.append(f"Title: {short_desc}")
        if desc:
            text_parts.append(f"Description: {desc}")
        if resolution:
            text_parts.append(f"Resolution: {resolution}")
        
        ticket_text = " ".join(text_parts)
        
        tickets_by_category[category].append({
            "incident_number": incident_number,
            "category": category,
            "priority": priority,
            "state": state,
            "text": ticket_text
        })
    
    return tickets_by_category


def generate_positive_pairs(tickets_by_category, max_pairs_per_category=50):
    """
    Generate positive pairs (same category).
    
    Args:
        tickets_by_category: Dict of category -> list of tickets
        max_pairs_per_category: Max positive pairs to generate per category
    
    Returns:
        List of positive pairs
    """
    logger.info("Generating positive pairs...")
    positive_pairs = []
    
    for category, tickets in tickets_by_category.items():
        if len(tickets) < 2:
            continue
        
        # Generate pairs within same category
        category_pairs = []
        for i, ticket1 in enumerate(tickets):
            for ticket2 in tickets[i+1:]:
                category_pairs.append({
                    "text1": ticket1["text"],
                    "text2": ticket2["text"],
                    "label": 1,  # Similar
                    "category1": ticket1["category"],
                    "category2": ticket2["category"],
                    "ticket1_id": ticket1["incident_number"],
                    "ticket2_id": ticket2["incident_number"]
                })
        
        # Sample to avoid overwhelming single categories
        if len(category_pairs) > max_pairs_per_category:
            category_pairs = random.sample(category_pairs, max_pairs_per_category)
        
        positive_pairs.extend(category_pairs)
        logger.info(f"  {category}: {len(category_pairs)} positive pairs")
    
    logger.info(f"Generated {len(positive_pairs)} positive pairs")
    return positive_pairs


def generate_negative_pairs(tickets_by_category, num_negative_pairs=None):
    """
    Generate negative pairs (different categories).
    
    Args:
        tickets_by_category: Dict of category -> list of tickets
        num_negative_pairs: Number of negative pairs to generate (default: match positive count)
    
    Returns:
        List of negative pairs
    """
    logger.info("Generating negative pairs...")
    negative_pairs = []
    
    all_categories = list(tickets_by_category.keys())
    all_tickets = []
    for tickets in tickets_by_category.values():
        all_tickets.extend(tickets)
    
    if num_negative_pairs is None:
        # Default: generate same number as we'd expect for positive pairs
        num_negative_pairs = len(all_tickets) * 2
    
    attempts = 0
    max_attempts = num_negative_pairs * 3
    
    while len(negative_pairs) < num_negative_pairs and attempts < max_attempts:
        attempts += 1
        
        # Randomly sample two tickets
        ticket1 = random.choice(all_tickets)
        ticket2 = random.choice(all_tickets)
        
        # Ensure different categories and different tickets
        if ticket1["category"] != ticket2["category"] and ticket1["incident_number"] != ticket2["incident_number"]:
            negative_pairs.append({
                "text1": ticket1["text"],
                "text2": ticket2["text"],
                "label": 0,  # Dissimilar
                "category1": ticket1["category"],
                "category2": ticket2["category"],
                "ticket1_id": ticket1["incident_number"],
                "ticket2_id": ticket2["incident_number"]
            })
    
    logger.info(f"Generated {len(negative_pairs)} negative pairs")
    return negative_pairs


def save_training_data(positive_pairs, negative_pairs, output_file):
    """
    Save training pairs to JSON file.
    """
    training_data = {
        "positive_pairs": positive_pairs,
        "negative_pairs": negative_pairs,
        "stats": {
            "num_positive": len(positive_pairs),
            "num_negative": len(negative_pairs),
            "total_pairs": len(positive_pairs) + len(negative_pairs),
            "balance_ratio": len(negative_pairs) / len(positive_pairs) if positive_pairs else 0
        }
    }
    
    logger.info(f"Saving training data to {output_file}...")
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(training_data, f, indent=2)
    
    logger.info(f"Training data saved: {len(positive_pairs)} positive, {len(negative_pairs)} negative pairs")
    
    # Print statistics
    print("\n" + "="*60)
    print("TRAINING DATA GENERATION COMPLETE")
    print("="*60)
    print(f"\n📊 Statistics:")
    print(f"  Positive pairs (similar): {len(positive_pairs)}")
    print(f"  Negative pairs (dissimilar): {len(negative_pairs)}")
    print(f"  Total pairs: {len(positive_pairs) + len(negative_pairs)}")
    print(f"  Balance ratio: {len(negative_pairs) / len(positive_pairs):.2f}:1")
    print(f"\n💾 Saved to: {output_file}")
    print("="*60 + "\n")


def main():
    """Generate training pairs from database tickets."""
    
    # Configuration
    output_file = os.path.join(
        os.path.dirname(__file__), 
        'data', 
        'training_pairs.json'
    )
    max_pairs_per_category = 50
    
    try:
        # Fetch tickets
        tickets_by_category = get_tickets_by_category()
        
        if not tickets_by_category:
            logger.error("No tickets found in database!")
            return
        
        print(f"\n📊 Found tickets in {len(tickets_by_category)} categories")
        for category, tickets in sorted(tickets_by_category.items(), key=lambda x: len(x[1]), reverse=True)[:5]:
            print(f"  {category}: {len(tickets)} tickets")
        
        # Generate positive pairs
        positive_pairs = generate_positive_pairs(tickets_by_category, max_pairs_per_category)
        
        # Generate negative pairs (balanced with positive)
        negative_pairs = generate_negative_pairs(tickets_by_category, len(positive_pairs))
        
        # Save training data
        save_training_data(positive_pairs, negative_pairs, output_file)
        
    except Exception as e:
        logger.error(f"Error generating training pairs: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
