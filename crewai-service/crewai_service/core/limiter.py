"""Shared rate limiter so cost-incurring endpoints across routers can throttle
against a single instance registered on app.state."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
