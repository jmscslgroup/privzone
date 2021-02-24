from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from .serializers import EntrySerializer, CreateEntrySerializer
from .models import Entry
from rest_framework.views import APIView
from rest_framework.response import Response

import json

# Status checking

def vin_okay(vin):
    return len(vin) == 17

def region_okay(region):
    has_type = region.get("type", "neither") in ["circle", "polygon"]
    has_data = region.get("data", False)
    
    if not (has_type and has_data):
        return False
    
    tp = region.get("type")
    dat = region.get("data")
    
    if tp == "circle":
        okay = type(dat) == dict
        okay = okay and dat.get("center", False)
        okay = okay and dat.get("radius", False)
        if okay:
            okay = len(dat.get("center")) == 2
    else:
        okay = type(dat) == list
        okay = okay and len(dat) > 2
        okay = okay and all(len(c) == 2 for c in dat)
        
    return okay

def regions_okay(regions):
    try:
        regions = json.loads(regions)
    except:
        return False, None
    is_list = type(regions) == list
    has_data = len(regions) > 0
    regions_okay = all(region_okay(r) for r in regions)
    
    okay = is_list and has_data and region_okay
    
    return okay, regions

#Views

class EntryView(generics.ListAPIView):
    queryset = Entry.objects.all()
    serializer_class = EntrySerializer
    
class CreateEntryView(APIView):
    serializer_class = CreateEntrySerializer
    
    def post(self, request, format=None):
        
        # if not self.request.session.exists(self.request.session.session_key):
        #     self.request.session.create()

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            vin = serializer.data.get('vin')
            regions = serializer.data.get('regions')
            
            status_region, regions_parsed = regions_okay(regions)
            status_vin = vin_okay(vin)
            if status_region and status_vin:
                
                entry = Entry(vin=vin, regions=regions)
                entry.created_at = timezone.now()
                # uncomment this following line to save into database
                # entry.save()
                return Response(EntrySerializer(entry).data, status=status.HTTP_201_CREATED)
        
        return Response(status=status.HTTP_400_BAD_REQUEST)