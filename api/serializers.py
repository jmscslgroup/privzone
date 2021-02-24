from rest_framework import serializers
from .models import Entry


class EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ("vin", "regions", "created_at")


class CreateEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entry
        fields = ("vin", "regions")