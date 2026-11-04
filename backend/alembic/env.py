"""Alembic environment running migrations through the async engine."""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy.engine import Connection, make_url
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.db.models import Base

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _database_url() -> str:
    # This root is legacy PostgreSQL-only.  Runtime DATABASE_URL is deliberately
    # ignored so a SQLite app configuration cannot be mistaken for a source DB.
    url = (context.config.get_main_option("sqlalchemy.url") or "").strip()
    if not url:
        url = os.environ.get("LEGACY_DATABASE_URL", "").strip()
    try:
        parsed = make_url(url)
    except Exception:
        raise RuntimeError("A valid legacy PostgreSQL URL is required") from None
    if parsed.drivername != "postgresql+asyncpg" or not parsed.database:
        raise RuntimeError("A valid legacy PostgreSQL URL is required")
    return url


def run_migrations_offline() -> None:
    context.configure(url=_database_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _run_sync_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_database_url())
    async with engine.connect() as connection:
        await connection.run_sync(_run_sync_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
