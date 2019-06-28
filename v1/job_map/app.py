## import dependencies
from flask import Flask, render_template, jsonify, redirect
import pymongo
import json
from bson import json_util
from flask_pymongo import PyMongo
import os
import requests
import bs4
from bs4 import BeautifulSoup as bs
import pandas as pd
import time
from pymongo import MongoClient
import re
import statistics as s

## establish local or cloud connection variable to mongodb
conn = os.environ.get('MONGODB_URI')
if not conn:
   	conn = "mongodb://localhost:27017/job_search_db"

## initalize flask app
app = Flask(__name__)

## establish configurations
app.config["MONGO_URI"] = conn
mongo = PyMongo(app)

## establish index route, render template
@app.route('/')
def index():
	jobs = mongo.db.search_results.find()
	return render_template('index.html', jobs=jobs)

## establish api route to show all json data
@app.route('/api')
def json_api():
	data = []
	for x in mongo.db.search_results.find():
		x.pop('_id')
		data.append(x)
	return jsonify(data)

## establish consumer price index route to show cpi data
@app.route('/cpi')
def cpi_route():
	cpi_list = []
	for x in mongo.db.cpi.find():
		x.pop('_id')
		cpi_list.append(x)
	return jsonify(cpi_list)

## initalize search based on query string which is passed from jQuery
@app.route('/filter/<queryString>')
def filter(queryString):
	data = []
	query = {'Search_Term': queryString}
	for x in mongo.db.search_results.find(query):
		x.pop('_id')
		data.append(x)
	return jsonify(data)

## return json of all unique search terms in the database
@app.route('/jobs')
def list_of_jobs():
	list_jobs = mongo.db.search_results.distinct( "Search_Term" )
	list_jobs.sort()
	jlist = []
	for i in list_jobs:
		dict1 = {}
		dict1['title'] = i
		dict1['label'] = i.title()
		jlist.append(dict1)
	return jsonify(jlist)

## calculate and return salary data for job posts (where salary info is provided)	
@app.route('/salary/<queryString>')
def get_salary(queryString):
	query = {'Search_Term': queryString}
	salaries_list = []
	for _dict in mongo.db.search_results.find(query):
		salary_info = _dict['Salary_Info']
		if 'year' in salary_info: #since all annual salaries contain 'year'
			try:
				salary_info = re.sub(',', '', salary_info) #removes commas
				annually = re.findall(r'\b\d+\b', salary_info) #grabs integers from strings
				annually = [int(i) for i in annually] #converts to ints
				mean = s.mean(annually) #takes ranges like $12,000 - $14,000 and averages them
				salaries_list.append(mean) #appends the value to a list of salaries
			except:
				pass
		elif 'hour' in salary_info:
			try:
				hourly = re.findall(r'\b\d+\b',salary_info)
				hourly = [int(i)*2000 for i in hourly] #doubling and multiplying by 1000 to estimate annual salary from hourly
				mean = s.mean(hourly)
				salaries_list.append(mean)
			except:
				pass
		else:
			pass
	med_sal = s.median(salaries_list)
	med_sal_format = '$' + "{:,.0f}".format(med_sal)
	avg_sal = s.mean(salaries_list)
	avg_sal_format = '$' + "{:,.0f}".format(avg_sal)

	return_dict = {
		'median_salary' : med_sal_format,
		'average_salary': avg_sal_format
	}

	return(jsonify(return_dict))

if __name__ == '__main__':
	app.run()