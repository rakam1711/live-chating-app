const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = {}; // {socket.id: username}
let friends = {}; // {username: [friend1, friend2, ...]}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/users", (req, res) => {
  res.sendFile(__dirname + "/users.html");
});

app.get("/friends", (req, res) => {
  res.sendFile(__dirname + "/friends.html");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  // Assign username to the socket
  socket.on("set username", (username) => {
    users[socket.id] = username;
    if (!friends[username]) {
      friends[username] = []; // Initialize friend list if not already initialized
    }
    io.emit("user list", Object.values(users)); // Update user list for all clients
    io.to(socket.id).emit("user set", { username, friends: friends[username] });
    console.log(`${username} joined the chat`);
  });

  // Handle adding a friend
  socket.on("add friend", (friendName) => {
    const username = users[socket.id];
    if (username && friendName && !friends[username].includes(friendName)) {
      friends[username].push(friendName);
      io.to(socket.id).emit("friend list", friends[username]); // Update friend list for the user
      console.log(`${username} added ${friendName} as a friend`);
    }
  });

  // Handle private message
  socket.on("private message", ({ recipient, msg }) => {
    const recipientSocketId = Object.keys(users).find(
      (key) => users[key] === recipient
    );
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("chat message", {
        sender: users[socket.id],
        msg,
      });
    } else {
      io.to(socket.id).emit("error", `User ${recipient} not found`);
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log(`${users[socket.id]} disconnected`);
    delete users[socket.id];
    io.emit("user list", Object.values(users)); // Update user list for all clients
  });
});

server.listen(3007, () => {
  console.log("listening on *:3007");
});
