from django.urls import path
from .views import EntryView, CreateEntryView

urlpatterns = [
    path("entries/", EntryView.as_view()),
    path("add-entry/", CreateEntryView.as_view())
]
