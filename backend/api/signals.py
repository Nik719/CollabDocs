"""
Signals (brief §4.5): AuditLog written automatically on every Document save.

Connected in ``ApiConfig.ready()``. The handlers run synchronously inside the
same ``transaction.atomic()`` block as the document save (see services.py),
so a rollback also discards the AuditLog entry.

Per the brief, ``instance._state.adding`` distinguishes create vs update.
Django flips ``_state.adding`` to False *before* ``post_save`` fires, so the
flag is captured in ``pre_save`` and consumed in ``post_save``.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import AuditLog, Document


@receiver(pre_save, sender=Document)
def capture_adding_state(sender, instance, **kwargs):
    """Snapshot ``_state.adding`` while it still reflects create vs update."""
    instance._was_adding = instance._state.adding


@receiver(post_save, sender=Document)
def write_document_audit_log(sender, instance, **kwargs):
    """Record actor, action, model_name and object_id for every save."""
    was_adding = getattr(instance, '_was_adding', kwargs.get('created', False))
    AuditLog.objects.create(
        actor=instance.created_by,
        action='created' if was_adding else 'updated',
        model_name='Document',
        object_id=str(instance.id),
    )
