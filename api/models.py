from django.db import models

# Create your models here.


class Entry(models.Model):
    vin = models.CharField(max_length=17, unique=False)
    offset = models.FloatField(unique=False)
    regions = models.TextField(unique=False)
    created_at = models.DateTimeField(auto_now_add=True)
