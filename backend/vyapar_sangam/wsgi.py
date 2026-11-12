"""
WSGI config for vyapar_sangam project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vyapar_sangam.settings')

application = get_wsgi_application()
