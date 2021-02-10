from django.shortcuts import render
from django.http import HttpResponse
from rest_framework import generics
from .serializers import EntrySerializer
from .models import Entry

# Create your views here.

class EntryView(generics.ListAPIView):
    queryset = Entry.objects.all()
    serializer_class = EntrySerializer