import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Імпортуємо Base з вашого файлу моделей для роботи autogenerate
from models import Base 

config = context.config

# Налаштування логування
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_online():
    # Отримуємо URL прямо з системних змінних, які передав Docker
    db_url = os.getenv("DATABASE_URL")
    
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=db_url,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

run_migrations_online()
