from django.test import TestCase
from api.models import Entry

# dummy test


class Test_Entry(TestCase):
    def setUp(self):
        Entry.objects.create(vin="thisisvin", regions="data this is some coordinate")
        Entry.objects.create(vin="thisisvin2", regions="data this is some coordinate2")

    def test_check_correct_data(self):
        """Data is correct when initialzied"""
        one = Entry.objects.get(vin="thisisvin")
        two = Entry.objects.get(vin="thisisvin2")
        self.assertEqual(one.regions, "data this is some coordinate")
        self.assertEqual(two.regions, "data this is some coordinate2")
