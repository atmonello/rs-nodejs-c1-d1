const express = require('express');
const cors = require('cors');

const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
app.use(express.json());

const users = [];

function findUserByUsername(username) {
  return users.find(u => u.username === username);
}

function findUserIndex(username) {
  return users.findIndex(u => u.username === username);
}

function findTodoIndexInUser(userTodos = [], todoId) {
  return userTodos.findIndex(t => t.id === todoId);
}

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;
  if (!username) return response.status(400).json({
    success: false, error: "missing_username"
  });

  const user = findUserByUsername(username);

  if (!user) return response.status(400).json({
    success: false, error: "user_not_found"
  });

  request.user = user;
  return next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;
  try {
    if (findUserByUsername(username)) throw new Error("username_already_exists");

    const user = {
      id: uuidv4(),
      name,
      username,
      todos: [],
    };
    users.push(user);
    return response.status(201).json({
      success: true,
      message: user
    });
  } catch (error) {
    return response.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  try {
    return response.json({
      success: true,
      message: request.user.todos
    });
  } catch (error) {
    return response.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/todos', checksExistsUserAccount, (request, response) => {
  const { title, deadline } = request.body;
  const { user: { username } } = request;
  try {
    if (!title || !deadline) throw new Error("missing_todo_data");

    const todo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };
    users[findUserIndex(username)].todos.push(todo);

    return response.status(201).json({
      success: true,
      message: todo,
    });
  } catch (error) {
    return response.status(400).json({
      success: false,
      error: error.message,
    });

  }
});

app.put('/todos/:id', checksExistsUserAccount, (request, response) => {
  const { title, deadline } = request.body;
  const { id: todoId } = request.params;
  try {
    if (!title && !deadline) throw new Error("missing_todo_update_info");
    const currentUser = users[findUserIndex(request.user.username)];
    const userTodos = currentUser.todos;
    const currentTodo = userTodos[findTodoIndexInUser(userTodos, todoId)];

    if (!currentTodo) throw new Error("todo_not_found");

    const todoNewDate = deadline ? new Date(deadline) : currentTodo.deadline;
    const updatedTodo = {
      ...currentTodo,
      deadline: todoNewDate,
      title,
    };

    userTodos[findTodoIndexInUser(userTodos, todoId)] = updatedTodo;

    return response.json({
      success: true,
      message: updatedTodo
    });
  } catch (error) {
    const errorStatusCode = error.message === "todo_not_found" ? 404 : 400;
    return response.status(errorStatusCode).json({
      success: false,
      error: error.message,
    });
  }
});

app.patch('/todos/:id/done', checksExistsUserAccount, (request, response) => {
  const { id: todoId } = request.params;
  try {
    const currentUser = users[findUserIndex(request.user.username)];
    const userTodos = currentUser.todos;
    const currentTodo = userTodos[findTodoIndexInUser(userTodos, todoId)];
    if (!currentTodo) throw new Error("todo_not_found");

    const updatedTodo = {
      ...currentTodo,
      done: true,
    };
    userTodos[findTodoIndexInUser(userTodos, todoId)] = updatedTodo;
    return response.json({
      success: true,
      message: updatedTodo
    });
  } catch (error) {
    const errorStatusCode = error.message === "todo_not_found" ? 404 : 400;
    return response.status(errorStatusCode).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete('/todos/:id', checksExistsUserAccount, (request, response) => {
  const { id: todoId } = request.params;
  try {
    const currentUser = users[findUserIndex(request.user.username)];
    const userTodos = currentUser.todos;
    const currentTodo = userTodos[findTodoIndexInUser(userTodos, todoId)];
    if (!currentTodo) throw new Error("todo_not_found");

    users[findUserIndex(request.user.username)].todos.splice(
      userTodos[findTodoIndexInUser(userTodos, todoId)],
      1
    );

    return response.status(204).json({
      success: true,
    });
  } catch (error) {
    const errorStatusCode = error.message === "todo_not_found" ? 404 : 400;
    return response.status(errorStatusCode).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = app;