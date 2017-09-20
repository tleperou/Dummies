# Dummies

Dummy projects and/or extracted code from projects.

## commands

This is a part of a project.

create.js :
* proceed a queue of commands, with KueJS
* download and read an instruction file (currently yaml)
* fill respective object's queues

find.js
* connect with SSH to a remote server
* prepare the local path
* download and read a yaml instructions

## monitor-api-2

This is a handy module to identify the amount of data per client (according to DB records). A PDF is generated and an email is send to the client.

Unfortunately, the client wants a PDF version sent to his email address.

## users-import

A small part a project, downloading and reading a CSV file to inject new user records into a mongoDB.

This one use KueJS to proceed operation within the memory.

Some users import files containing more than 10k users.

## users-new-password

Idem. Just a piece of a project showing a new-password process.

The users need the token to change in fine their password. It updates the mongoDB user record, renders an EJS template and push an email into the right queue.
