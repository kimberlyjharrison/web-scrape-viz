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

conn = os.environ.get('MONGODB_URI')
if not conn:
   	conn = "mongodb://localhost:27017/job_search_db"

app = Flask(__name__)

app.config["MONGO_URI"] = conn
mongo = PyMongo(app)

@app.route('/')
def index():
	jobs = mongo.db.search_results.find()
	return render_template('index.html', jobs=jobs)

@app.route('/api')
def json_api():
	data = []
	for x in mongo.db.search_results.find():
		x.pop('_id')
		data.append(x)
	return jsonify(data)

@app.route('/filter/<queryString>')
def filter(queryString):
	data = []
	query = {'Search_Term': queryString}
	for x in mongo.db.search_results.find(query):
		x.pop('_id')
		data.append(x)
	return jsonify(data)

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
	

if __name__ == '__main__':
	app.run(debug=True)