from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AuditLog, Document


@receiver(post_save, sender=Document)
def document_post_save(sender, instance, created, **kwargs):
    """
    Automatically write an AuditLog entry every time a Document is saved.
    Uses instance._state.adding to distinguish create vs update.
    This signal fires inside the same transaction.atomic() block as the
    document save (Django signals are synchronous by default).
    """
    action = 'created' if created else 'updated'
    AuditLog.objects.create(
        actor=instance.created_by,
        action=action,
        model_name='Document',
        object_id=str(instance.id),
    )
