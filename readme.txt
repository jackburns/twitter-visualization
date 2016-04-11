INSTALLATION INSTRUCTIONS:

If node.js not installed:

sudo apt-get install nodejs
sudo apt-get install npm

(optional symbolic link) sudo ln -s /usr/bin/nodejs /usr/bin/node

If redis is not installed:
(taken from http://redis.io/topics/quickstart)

wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make

Then start the redis server using:
src/redis-server

Finally:

1. Extract zip file and cd into directory
2. Run "npm install" to install all necessary dependencies
3. Run "node server.js" to start server
4. Navigate to localhost:3000 in a browser to view

Be warned! The API I used seems to love long obscure words!

Here's a writeup on the project:

Technology: 
For this app I chose to use Node.js coupled with express for my backend due to familiarity, ease of use, and performance. Express was mostly used for the express-session module which allowed for an easy solution to managing user sessions and was easy to integrate with redis thanks to the connect-redis module. For the client-side, there's not a whole lot going on. I opted not to use Angular.js as it wouldn't have saved me much time in implementing and would have introduced a very bulky framework that just wasn't needed. Instead I relied on the standard jQuery library and bootstrap css template although even the project could have easily been completed without either. 

Implementation:
As all the business logic is on the server, the client doesn't have many responsibilities besides ajax requests and updating the DOM. There is some validation performed to make sure duplicate letters aren't sent to the server and wasting resources however. The "hangman" drawing is accomplished using HTML5 canvas which I hadn't worked with before but proved to be straightforward for something like a stick figure.

On the server all the event handling is processed in the main server.js component while game validation is done in the Hangman.js module. Global game stats are saved in redis when they are updated but are only queried on server start for better performance. The two main data-structures for storing state are the guessedLetters (fairly obvious) and the validList. ValidList starts as a list with null elements equal to the length of the word and then gets filled in just like the actual client representation of the game.

For both, I made a few design decisions such as not separating the client canvas rendering into it's own module just because the project didn't seem complex enough to justify it.

Improvements and scaling:

One big performance hit is the initial game load time caused by a call to a random word API. Ideally, no network calls would have to be made to generate a random word although one possible solution would be to store some amount of random words and only query for more when the cache is starting to run low.

Additionally, if this project were to actually launch the client-side JavaScript would be minified and diagnostics would have to be run on library CDN performance versus hosting the files.

For scaling, node makes it relatively straightforward to scale across multiple cores using recluster. The only change would have to be that the gameStats would always query redis, everything else related to state already goes through redis which solves that normally troublesome problem. Scaling across multiple machines is also doable but something I haven't ever attempted (yet!).

I also could have improved the client-side UI considerably as I chose to make cuts there due to time constraints from school work. Ideally it'd look much less barebones and with a keyboard representation as an additional method of input.

Finally, the back-end should be tested! If the project was to move forward I think that would be the first thing I’d add.




