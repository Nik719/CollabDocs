from django.db import migrations


# Sets every table's auto-increment sequence so the first inserted row gets id=1001.
# setval(seq, 1000, true) means "last used value is 1000", so next = 1001.
TABLES = [
    'users',
    'workspaces',
    'workspace_members',
    'documents',
    'document_versions',
    'comments',
    'tags',
    'audit_logs',
]

forward_sql = "\n".join(
    f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), 1000, true);"
    for t in TABLES
)

reverse_sql = "\n".join(
    f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), 1, false);"
    for t in TABLES
)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(sql=forward_sql, reverse_sql=reverse_sql),
    ]
