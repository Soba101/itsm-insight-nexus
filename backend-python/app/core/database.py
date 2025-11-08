"""
Database Connection - PostgreSQL connection with pgvector support.

Provides connection pooling and utilities for interacting with Postgres
database that has pgvector extension enabled.
"""

import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

# Global connection pool
_connection_pool: Optional[pool.SimpleConnectionPool] = None


def get_db_config() -> dict:
    """Get database configuration from environment variables."""
    return {
        "host": os.getenv("DB_HOST", "postgres"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "database": os.getenv("DB_NAME", "itsm_db"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
    }


def init_connection_pool(minconn: int = 1, maxconn: int = 10):
    """
    Initialize the database connection pool.
    
    Args:
        minconn: Minimum number of connections to maintain
        maxconn: Maximum number of connections allowed
    """
    global _connection_pool
    
    if _connection_pool is not None:
        logger.warning("Connection pool already initialized")
        return
    
    config = get_db_config()
    
    try:
        _connection_pool = pool.SimpleConnectionPool(
            minconn,
            maxconn,
            **config
        )
        logger.info(f"Database connection pool initialized: {config['host']}:{config['port']}/{config['database']}")
    except Exception as e:
        logger.error(f"Failed to initialize connection pool: {e}")
        raise RuntimeError(f"Database connection pool initialization failed: {e}")


def get_connection():
    """
    Get a connection from the pool.
    
    Returns:
        psycopg2.connection: Database connection
        
    Raises:
        RuntimeError: If pool is not initialized or no connections available
    """
    if _connection_pool is None:
        init_connection_pool()
    
    try:
        conn = _connection_pool.getconn()
        if conn is None:
            raise RuntimeError("No database connections available")
        return conn
    except Exception as e:
        logger.error(f"Failed to get database connection: {e}")
        raise RuntimeError(f"Could not get database connection: {e}")


def release_connection(conn):
    """
    Return a connection to the pool.
    
    Args:
        conn: psycopg2 connection to release
    """
    if _connection_pool is None:
        logger.warning("Connection pool not initialized")
        return
    
    try:
        _connection_pool.putconn(conn)
    except Exception as e:
        logger.error(f"Error releasing connection: {e}")


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    Automatically handles connection acquisition and release.
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM tickets")
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()  # Auto-commit on success
    except Exception as e:
        conn.rollback()  # Auto-rollback on error
        logger.error(f"Database transaction error: {e}")
        raise
    finally:
        release_connection(conn)


def close_connection_pool():
    """Close all connections in the pool."""
    global _connection_pool
    
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")


def test_connection() -> bool:
    """
    Test database connectivity and pgvector extension.
    
    Returns:
        bool: True if connection and pgvector are working
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Test basic connectivity
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            if result[0] != 1:
                logger.error("Database connection test failed")
                return False
            
            # Test pgvector extension
            cursor.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
            vector_ext = cursor.fetchone()
            
            if not vector_ext:
                logger.error("pgvector extension not found")
                return False
            
            logger.info(f"Database connection OK. pgvector version: {vector_ext[1]}")
            cursor.close()
            return True
            
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
