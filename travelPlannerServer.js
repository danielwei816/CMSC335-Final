const http = require('http');
const ejs = require('ejs');
const express = require('express');
const nodemon = require('nodemon');
const path = require("path");
const { stdin, argv } = require('process');
const { readFile } = require('fs');
let fs = require('fs');
const bodyParser = require("body-parser");

let portNumber = 5000;
const app = express();

require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
const { MongoClient, ServerApiVersion } = require('mongodb');

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;


const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const uri = `mongodb+srv://${userName}:${password}@cluster0.u3kal6a.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const webServer = http.createServer((request, response) => {
	response.writeHead(httpSuccessStatus, {'Content-type':'ejs'});
	response.end(); 
});

console.log(`Web server is running at http://localhost:${portNumber}`);
	process.stdin.setEncoding("utf8");

	process.stdout.write("Type stop to shutdown the server: ")
	process.stdin.on('readable', () => { 
		let dataInput = process.stdin.read();
		if (dataInput !== null) {
			let command = dataInput.trim();
			if (command === "stop") {
				console.log("Shutting down the server");
				process.exit(0); 
			} else {
				console.log(`Invalid command: ${command}`);
			}
			dataInput = process.stdin.read()
		}
	});

    app.set("views", path.resolve(__dirname, "templates"));
	app.set("view engine", "ejs");

    app.get("/", (request, response) => { 
		response.render("main");
	});

    app.get("/plan", (request, response) => { 
		response.render("plan");
	});

    app.use(bodyParser.urlencoded({extended:false}));
	app.post("/plan", (request, response) => { 
		let {name, email, destination, from, to, travelMethod, purpose} = request.body;

		async function main() {
		
			try {
				await client.connect();
				let trip = {name: name, email: email, destination: destination, from: from, to: to, travelMethod: travelMethod, purpose: purpose}
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

    app.get("/view", (request,response) => {
		response.render("view");
	});

    app.post("/view", (request, response) => { 
		let {email} = request.body;

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
			let filter = {email: emailAddress};
			const cursor = client.db(databaseAndCollection.db)
			.collection(databaseAndCollection.collection)
			.find(filter);
		
			const result = await cursor.toArray();

			let it = "<table border=\"2\"> <tr> <th>Name</th> <th>Destination</th> <th>From</th> <th>To</th> <th>Method</th> </tr>"
			result.forEach(function(elem, index) {
					it+=`<tr> <td>${elem.name}</td> <td> ${elem.destination} </td> <td> ${elem.from} </td> <td> ${elem.to} </td> <td> ${elem.travelMethod} </td>   </tr>`
			});
			it+="</table>"

			const variables = {
                email: emailAddress,
				itemsTable: it
			}
			response.render("displayTrips",variables);
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

    app.listen(portNumber);

