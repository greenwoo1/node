"""Initial migration

Revision ID: 001
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types
    op.execute("""
    DO $$ BEGIN
        CREATE TYPE userrole AS ENUM ('Super Admin', 'Admin 2L', 'Admin 1L', 'Service Manager');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE userstatus AS ENUM ('active', 'suspended', 'inactive');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE serverstatus AS ENUM ('running', 'stoped', 'reserv', 'abuse', 'maintaince');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE domainstatus AS ENUM ('Active', 'Suspended', 'Abuse', 'Maintance');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE accountstatus AS ENUM ('Active', 'Deactivated');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE groupstatus AS ENUM ('Enabled', 'Disabled');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    op.execute("""
    DO $$ BEGIN
        CREATE TYPE currency AS ENUM ('USD', 'EUR', 'UAH');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    # Create users table
    op.create_table('users',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('username', sa.String(length=50), nullable=False),
                    sa.Column('email', sa.String(length=100), nullable=False),
                    sa.Column('phone_number', sa.String(length=20), nullable=True),
                    sa.Column('password_hash', sa.String(length=255), nullable=False),
                    sa.Column('role',
                              sa.Enum('Super Admin', 'Admin 2L', 'Admin 1L', 'Service Manager', name='userrole'),
                              nullable=True),
                    sa.Column('status', sa.Enum('active', 'suspended', 'inactive', name='userstatus'), nullable=True),
                    sa.Column('last_login_ip', sa.String(length=45), nullable=True),
                    sa.Column('allowed_ips', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create groups table
    op.create_table('groups',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('title', sa.String(length=100), nullable=False),
                    sa.Column('projects', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('status', sa.Enum('Enabled', 'Disabled', name='groupstatus'), nullable=True),
                    sa.Column('description', sa.Text(), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_groups_id'), 'groups', ['id'], unique=False)

    # Create servers table
    op.create_table('servers',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('os', sa.String(length=100), nullable=True),
                    sa.Column('ip_address', sa.String(length=45), nullable=False),
                    sa.Column('additional_ips', sa.Text(), nullable=True),
                    sa.Column('comments', sa.Text(), nullable=True),
                    sa.Column('hoster', sa.String(length=100), nullable=True),
                    sa.Column('status',
                              sa.Enum('running', 'stoped', 'reserv', 'abuse', 'maintaince', name='serverstatus'),
                              nullable=True),
                    sa.Column('group_id', sa.Integer(), nullable=True),
                    sa.Column('project', sa.String(length=100), nullable=True),
                    sa.Column('country', sa.String(length=2), nullable=True),
                    sa.Column('ssh_username', sa.String(length=50), nullable=True),
                    sa.Column('ssh_password', sa.String(length=255), nullable=True),
                    sa.Column('ssh_port', sa.Integer(), nullable=True),
                    sa.Column('container_password', sa.String(length=255), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
                    sa.Column('created_by', sa.Integer(), nullable=True),
                    sa.Column('updated_by', sa.Integer(), nullable=True),
                    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
                    sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
                    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_servers_id'), 'servers', ['id'], unique=False)

    # Create domains table
    op.create_table('domains',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('domain_name', sa.String(length=255), nullable=False),
                    sa.Column('group_id', sa.Integer(), nullable=True),
                    sa.Column('status', sa.Enum('Active', 'Suspended', 'Abuse', 'Maintance', name='domainstatus'),
                              nullable=True),
                    sa.Column('ns_records', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('a_records', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('aaaa_records', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
                    sa.Column('created_by', sa.Integer(), nullable=True),
                    sa.Column('updated_by', sa.Integer(), nullable=True),
                    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
                    sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
                    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id'),
                    sa.UniqueConstraint('domain_name')
                    )
    op.create_index(op.f('ix_domains_id'), 'domains', ['id'], unique=False)

    # Create finance table
    op.create_table('finance',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('server_id', sa.Integer(), nullable=True),
                    sa.Column('account_status', sa.Enum('Active', 'Deactivated', name='accountstatus'), nullable=True),
                    sa.Column('price', sa.Float(), nullable=True),
                    sa.Column('currency', sa.Enum('USD', 'EUR', 'UAH', name='currency'), nullable=True),
                    sa.Column('payment_date', sa.DateTime(timezone=True), nullable=True),
                    sa.Column('group_id', sa.Integer(), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
                    sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
                    sa.ForeignKeyConstraint(['server_id'], ['servers.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_finance_id'), 'finance', ['id'], unique=False)

    # Create settings table
    op.create_table('settings',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('user_id', sa.Integer(), nullable=True),
                    sa.Column('first_name', sa.String(length=50), nullable=True),
                    sa.Column('last_name', sa.String(length=50), nullable=True),
                    sa.Column('email', sa.String(length=100), nullable=True),
                    sa.Column('phone_number', sa.String(length=20), nullable=True),
                    sa.Column('allowed_ips', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id'),
                    sa.UniqueConstraint('user_id')
                    )
    op.create_index(op.f('ix_settings_id'), 'settings', ['id'], unique=False)

    # Create history table
    op.create_table('history',
                    sa.Column('id', sa.Integer(), nullable=False),
                    sa.Column('action', sa.String(length=50), nullable=False),
                    sa.Column('table_name', sa.String(length=50), nullable=False),
                    sa.Column('record_id', sa.Integer(), nullable=False),
                    sa.Column('changes', postgresql.JSON(astext_type=sa.Text()), nullable=True),
                    sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                    sa.Column('user_id', sa.Integer(), nullable=True),
                    sa.Column('server_id', sa.Integer(), nullable=True),
                    sa.Column('domain_id', sa.Integer(), nullable=True),
                    sa.Column('finance_id', sa.Integer(), nullable=True),
                    sa.ForeignKeyConstraint(['domain_id'], ['domains.id'], ),
                    sa.ForeignKeyConstraint(['finance_id'], ['finance.id'], ),
                    sa.ForeignKeyConstraint(['server_id'], ['servers.id'], ),
                    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_history_id'), 'history', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_history_id'), table_name='history')
    op.drop_table('history')
    op.drop_index(op.f('ix_settings_id'), table_name='settings')
    op.drop_table('settings')
    op.drop_index(op.f('ix_finance_id'), table_name='finance')
    op.drop_table('finance')
    op.drop_index(op.f('ix_domains_id'), table_name='domains')
    op.drop_table('domains')
    op.drop_index(op.f('ix_servers_id'), table_name='servers')
    op.drop_table('servers')
    op.drop_index(op.f('ix_groups_id'), table_name='groups')
    op.drop_table('groups')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS serverstatus")
    op.execute("DROP TYPE IF EXISTS domainstatus")
    op.execute("DROP TYPE IF EXISTS accountstatus")
    op.execute("DROP TYPE IF EXISTS groupstatus")
    op.execute("DROP TYPE IF EXISTS currency")