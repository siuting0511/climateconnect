from climateconnect_main.celery import app
from climateconnect_api.models import UserNotification

from datetime import timedelta
from django.utils import timezone

import logging
logger = logging.getLogger(__name__)


@app.task
def add(a, b):
    logger.info(f"testing.... {a+b}")


# @app.task
def remind_user_for_unread_notifications():
    LOGGER_PREFIX = "NOTIFICATION REMINDER: "
    DEFAULT_TIME = timezone.now() - timedelta(days=2)
    notifications = UserNotification.objects.filter(
        created_at__lte=DEFAULT_TIME,
        read_at__isnull=True
    )

    logger.error(f"Notifications count: {notifications.count()}")