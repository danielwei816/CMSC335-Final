const http = require('http');
const ejs = require('ejs');
const express = require('express');
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config()

// server initialization
let portNumber = 3000;
const app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.resolve(__dirname, "public")));

// mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const uri = `mongodb+srv://${userName}:${password}@cluster0.u3kal6a.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// api endpoints
app.get("/", (request, response) => {
	response.render("main");
});

app.get("/plan", (request, response) => {
	response.render("plan");
});

app.post("/plan", (request, response) => {
	let { name, email, destination, from, to, travelMethod, purpose } = request.body;

	async function main() {

		try {
			await client.connect();
			let trip = { name: name, email: email, destination: destination, from: from, to: to, travelMethod: travelMethod, purpose: purpose }
			await insert(client, databaseAndCollection, trip);

		} catch (e) {
			console.error(e);
		} finally {
			await client.close();
		}
	}

	async function insert(client, databaseAndCollection, application) {
		const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(application);
	}

	main().catch(console.error);

	const variables = {
		name: name,
		email: email,
		destination: destination,
		from: from,
		to: to,
		travelMethod: travelMethod,
		purpose: purpose
	}

	response.render("data", variables);
});

app.get("/view", (request, response) => {
	response.render("view");
});

app.post("/view", (request, response) => {
	let { email } = request.body;

	async function main() {

		try {
			await client.connect();
			await lookUpMany(client, databaseAndCollection, email);
		} catch (e) {
			console.error(e);
		} finally {
			await client.close();
		}
	}

	async function lookUpMany(client, databaseAndCollection, emailAddress) {
		let filter = { email: emailAddress };
		const cursor = client.db(databaseAndCollection.db)
			.collection(databaseAndCollection.collection)
			.find(filter);

		const result = await cursor.toArray();

		let it = "<table border=\"2\"> <tr> <th>Name</th> <th>Destination</th> <th>From</th> <th>To</th> <th>Method</th> </tr>"
		result.forEach(function (elem, index) {
			it += `<tr> <td>${elem.name}</td> <td> ${elem.destination} </td> <td> ${elem.from} </td> <td> ${elem.to} </td> <td> ${elem.travelMethod} </td>   </tr>`
		});
		it += "</table>"

		const variables = {
			email: emailAddress,
			itemsTable: it
		}
		response.render("displayTrips", variables);
	}

	main().catch(console.error);


});

app.get("/remove", (request, response) => {
	response.render("remove");
});

app.post("/remove", (request, response) => {
	async function main() {
		try {
			await client.connect();
			const result = await client.db(databaseAndCollection.db)
				.collection(databaseAndCollection.collection)
				.deleteMany({});

			const variables = {
				count: result.deletedCount
			}

			response.render("processRemove", variables)

		} catch (e) {
			console.error(e);
		} finally {
			await client.close();
		}
	}

	main().catch(console.error);
});

app.get("/weather-checker", (request, response) => {
	response.render("weatherChecker");
});

app.post("/weather-checker", async (request, response) => {
	const { latitude, longitude, date } = request.body;
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,windspeed_10m,precipitation&start_date=${date}&end_date=${date}&temperature_unit=fahrenheit&precipitation_unit=inch&windspeed_unit=mph`;
	const data = await (await fetch(url)).json();
	if (data.error) {
		response.render("weatherResult", { latitude, longitude, date, temperature: "ERROR", windspeed: "ERROR", precipitation: "ERROR"});
	} else {
		const avgTemp = data.hourly.temperature_2m.reduce((count, temp) => count + temp, 0) / data.hourly.temperature_2m.length;
		const avgWindspeed = data.hourly.windspeed_10m.reduce((count, temp) => count + temp, 0) / data.hourly.windspeed_10m.length;
		const avgPrecipitation = data.hourly.precipitation.reduce((count, temp) => count + temp, 0) / data.hourly.precipitation.length;
		response.render("weatherResult", { latitude, longitude, temperature: avgTemp.toFixed(2), windspeed: avgWindspeed.toFixed(2), precipitation: avgPrecipitation.toFixed(2), date});
	}
});

app.listen(portNumber, () => {
	console.log(`Server is listening on port ${portNumber}.`);
});