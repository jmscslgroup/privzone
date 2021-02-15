<h1 align="center">privzone</h1>
<h4 align="center">Webapp that allows you to associate privacy zones to a car, excluding those zones from data. </h4>

<p align="center">
<a href="https://github.com/jmscslgroup/privzone/actions?query=workflow%3A%22Code+Test%22"><img alt="Code Test" src="https://github.com/jmscslgroup/privzone/workflows/Code%20Test/badge.svg"></a>
<a href="https://github.com/jmscslgroup/privzone/actions?query=workflow%3ALint"><img alt="Lint Check" src="https://github.com/jmscslgroup/privzone/workflows/Lint/badge.svg"></a>
<a href="https://github.com/psf/black"><img alt="Code style: black" src="https://img.shields.io/badge/code%20style-black-000000.svg"></a>
</p>

### Running

###### Created using python 3.8

 - Setting up django.
   - `python -m pip install -r requirements.txt -r dev_requirements.txt`
   - `python manage.py makemigrations`
   - `python manage.py migrate`
 - Setting up frontend.
   - `cd frontend`
   - `npm install`
   - `npm run dev` (continuous rebuild on save) or `npm run build` (one time build)
 - Running the server.
   - `python manage.py runserver`