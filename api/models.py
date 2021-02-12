from django.db import models

# Create your models here.


class Entry(models.Model):
    vin = models.CharField(max_length=15, default="", unique=False)
    data = models.TextField(default="", unique=False)
    created_at = models.DateTimeField(auto_now_add=True)
