from django.db import models

# Create your models here.

# Create your models here.
class Fluoro_User(models.Model):
    User_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=32)
    pwd = models.CharField(max_length=32)


class User_file(models.Model):
    file_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=32)
    filename = models.CharField(max_length=32)