## import dependencies
from flask import Flask, render_template, jsonify, redirect
import pymongo
import json
from flask_pymongo import PyMongo
import os
import requests
import bs4
from bs4 import BeautifulSoup as bs
import pandas as pd
from splinter import Browser
from splinter.exceptions import ElementDoesNotExist
from selenium import webdriver
from pymongo import MongoClient
from uszipcode import SearchEngine
import re
import statistics as s

## establish local or cloud connection variable to mongodb
conn = os.environ.get('MONGODB_URI')
if not conn:
   	conn = "mongodb://localhost:27017/job_search_db2"

## initialize flask app
app = Flask(__name__)

## establish configurations
app.config["MONGO_URI"] = conn
mongo = PyMongo(app)

## establish index route, render template
@app.route('/')
def index():
	return render_template('index.html')

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

## establish route to initialize web scraping, store results in mongodb
@app.route('/search/<job_title>')
def search_and_map(job_title):

	## initialize lists.  this is a lot of lists.
	job_titles = []
	company_names = []
	locations = []
	salaries = []
	link_list = []
	loc_list = []
	zip_list = []
	coord_list = []
	city_list = []
	job_list = []

	## set url to make webscraping calls with user input as variable
	url = f'https://www.indeed.com/jobs?q={job_title}&limit=50'

	## function to scrape data for location, job title, location
	def scrapeData(class_str, list_name):
		element = soup.find_all(class_=class_str)
		for i in element:
			list_name.append(i.text.strip())
	
	## function to scrape salary data
	def scrapeSalary(num, list_name):
		salary_tags = soup.find_all(class_='row')
		for i in range(len(salary_tags)):
			try:
				salary = salary_tags[i].find(class_='salary').text.strip()
				list_name.append(salary)
			except:
				list_name.append("No Salary Info Provided")

	#function to scrape data for the direct link to the job post
	def scrapeLink(list_name):
		frontend = 'https://www.indeed.com/'
		links = soup.find_all('div', class_='title')
		for link in links:
			backend = link.find('a')['href']
			list_name.append(frontend+backend)
	
	## function to determine if location data provides a zipcode
	def hasZip(inputString):
		if any(char.isdigit() for char in inputString):
			return "".join(filter(lambda x: x.isdigit(), inputString))
		else:
			return inputString
	
	## function to get zip code based on location data and save to new list
	def getZip(str, zipList):
		if str.isdigit():
			zipList.append(str)
		else:
			try:
				search = SearchEngine(simple_zipcode=True)
				city_state_str = str.split(', ')
				city_state = search.by_city_and_state(city_state_str[0], city_state_str[1])
				zipList.append(city_state[0].zipcode)
			except:
				zipList.append("None")

	## function to get lat, lng for all locations and append to list
	def getCoord(str, coordList, cityList):
		search = SearchEngine(simple_zipcode=True)
		if str.isdigit():
			try:
				zipcode = search.by_zipcode(str)
				coords = [zipcode.lat, zipcode.lng]
				coordList.append(coords)
				cityList.append(zipcode.post_office_city)
			except:
				coordList.append(["None", "None"])
				cityList.append("None")
		else:
			coordList.append(["None", "None"])
			cityList.append(str)


	## initialize variables for web scraping
	executable_path = {'executable_path': '/usr/local/bin/chromedriver'}
	browser = Browser('chrome', **executable_path, headless=True)
	browser.visit(url)
	html = browser.html
	soup = bs(html, 'html.parser')

	## call functions to store scraped data
	scrapeData('title', job_titles)
	scrapeData('company', company_names)
	scrapeData('location', locations)
	num = len(job_titles)
	scrapeSalary(num, salaries)
	scrapeLink(link_list)

	## call hasZip function and append to loc_list
	for i in locations:
		loc_list.append(hasZip(i))

	## call getZip function to create a list of zip codes	
	for i in loc_list:
		getZip(i, zip_list)

	## call getCoord functino to get list of list of coordinates
	for i in zip_list[0:num]:
		getCoord(i, coord_list, city_list)

	## aggregate all data into list of dictionaries to pass to mongodb
	for i in range(num):
		try:
			job_dict = {}
			job_dict['Title'] = job_titles[i]
			job_dict['Company'] = company_names[i]
			job_dict["ZipCode"] = zip_list[i]
			job_dict['Location'] = city_list[i]
			job_dict["Coordinates"] = coord_list[i]
			job_dict["Salary_Info"] = salaries[i]
			job_dict['Link'] = link_list[i]
			job_dict['Search_Term']=job_title
			job_list.append(job_dict)
		except:
			break

	## remove any data with no coordinate information
	for i in job_list:
		if i["Coordinates"] == ['None', 'None']:
			job_list.remove(i)

	## set up mongodb connection 	
	client = MongoClient(conn)
	db = client['job_search_db2']

	## drop database if it does not exist.
	## for the future, we'd change this to append the mongodb for each search
	## and then call the data by search term
	db.search_results.drop()

	## create collection
	col = db['search_results']

	## add data to mongo db IF coordinates are floats
	for x in job_list:
		if isinstance(x['Coordinates'][0], float):
			col.insert_one(x)

	## return to index route
	return redirect('/', code=302)

## calculate and return salary data for job posts (where salary info is provided)
@app.route('/salary')
def get_salary():
	salaries_list = []
	for _dict in mongo.db.search_results.find():
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
		elif 'month' in salary_info:
			try:
				monthly = re.findall(r'\b\d+\b',salary_info)
				monthly = [int(i)*12 for i in monthly] #doubling and multiplying by 1000 to estimate annual salary from hourly
				mean = s.mean(monthly)
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