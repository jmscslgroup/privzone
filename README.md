<h1 align="center">privzone</h1>
<h4 align="center">Webapp that allows you to associate privacy zones to a car, excluding those zones from data. </h4>

<p align="center">
<a href="https://github.com/jmscslgroup/privzone/actions?query=workflow%3A%22Code+Test%22"><img alt="Code Test" src="https://github.com/jmscslgroup/privzone/workflows/Code%20Test/badge.svg"></a>
<a href="https://github.com/jmscslgroup/privzone/actions?query=workflow%3ALint"><img alt="Lint Check" src="https://github.com/jmscslgroup/privzone/workflows/Lint/badge.svg"></a>
<a href="https://github.com/psf/black"><img alt="Code style: black" src="https://img.shields.io/badge/code%20style-black-000000.svg"></a>
</p>

### Running



 - After installing python 3.8
   - `python -m pip install -r requirements.txt`
 - Setup configuration file
   - Create a json file named "django-config.json" with a key "SECRET_KEY" in the base directory of the project.
   - Example config file contents: 
        ```json
        {"SECRET_KEY": "8278s8878hijhji286167"}
        ```
   - If not placed in the base directory, make sure to update `CONFIG_FILE` in privzone/settings.py to be the relative path to the config file.
 - Migrations
   - `python manage.py makemigrations` and `python manage.py migrate` to set up default database.
 - Test server locally.
   - Make sure `debug=True` is set in privzone/settings.py
   - `python manage.py runserver`
 - Ready for deployment
   - Make sure `debug=False` is set in privzone/settings.py
   - `python manage.py collectstatic`