# Generated by Django 3.1.6 on 2023-03-29 18:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_auto_20210224_1141'),
    ]

    operations = [
        migrations.AddField(
            model_name='entry',
            name='offset',
            field=models.FloatField(default=-200),
            preserve_default=False,
        ),
    ]