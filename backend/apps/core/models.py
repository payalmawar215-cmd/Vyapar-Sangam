from django.db import models

class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    ``created_at`` and ``updated_at`` fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PlatformSettings(TimeStampedModel):
    """
    Singleton-style settings for the platform, e.g. intro video and poster.
    """
    intro_video_url = models.URLField(max_length=500, blank=True, default='')
    intro_video_poster = models.URLField(max_length=500, blank=True, default='')

    def __str__(self):
        return "Vyapar Sangam Platform Settings"

    class Meta:
        verbose_name = "Platform Settings"
        verbose_name_plural = "Platform Settings"
