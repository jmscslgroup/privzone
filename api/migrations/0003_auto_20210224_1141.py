# Generated by Django 3.1.6 on 2021-02-24 18:41

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_auto_20210224_1123"),
    ]

    operations = [
        migrations.RenameField(
            model_name="entry",
            old_name="data",
            new_name="regions",
        ),
    ]