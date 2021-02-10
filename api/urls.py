from django.urls import path
from .views import EntryView

urlpatterns = [
    path('home/', EntryView.as_view()),
    path('', EntryView.as_view())
]
