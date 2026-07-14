"""Alembic environment."""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from hg.config import get_settings
from hg.db import Base

# Import all models so Alembic registers them in metadata
import hg.modules.ai.models  # noqa: F401
import hg.modules.analytics.models  # noqa: F401
import hg.modules.assessment.models  # noqa: F401
import hg.modules.identity.invitations  # noqa: F401
import hg.modules.identity.models  # noqa: F401
import hg.modules.learning.models  # noqa: F401
import hg.modules.learning_units.models  # noqa: F401
import hg.modules.marketing.models  # noqa: F401
import hg.modules.people.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
