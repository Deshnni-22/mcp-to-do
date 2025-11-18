import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHttpServer } from '@modelcontextprotocol/sdk/server/httpstreamable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TODOS_FILE = path.join(__dirname, 'data', 'todos.json');

const app = express();
app.use(express.json());

// Helper to read/write todos
async function readTodos() {
  const data = await fs.readFile(TODOS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeTodos(todos) {
  await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));
}

// MCP Tool: Get all todos
app.post('/todos/get', async (req, res) => {
  const todos = await readTodos();
  res.json({ output: todos });
});

// MCP Tool: Add a todo
app.post('/todos/add', async (req, res) => {
  const { task } = req.body.input;
  const todos = await readTodos();
  const newTodo = { id: Date.now(), task, done: false };
  todos.push(newTodo);
  await writeTodos(todos);
  res.json({ output: newTodo });
});

// MCP Tool: Mark a todo as done
app.post('/todos/done', async (req, res) => {
  const { id } = req.body.input;
  const todos = await readTodos();
  const index = todos.findIndex(todo => todo.id === id);
  if (index === -1) return res.status(404).json({ error: 'Todo not found' });
  todos[index].done = true;
  await writeTodos(todos);
  res.json({ output: todos[index] });
});

// MCP Tool: Delete a todo
app.post('/todos/delete', async (req, res) => {
  const { id } = req.body.input;
  let todos = await readTodos();
  const initialLength = todos.length;
  todos = todos.filter(todo => todo.id !== id);
  if (todos.length === initialLength) return res.status(404).json({ error: 'Todo not found' });
  await writeTodos(todos);
  res.json({ output: `Deleted todo with id ${id}` });
});

// Register with MCP
createHttpServer(app, {
  tools: [
    {
      name: 'getTodos',
      description: 'Get the list of all todos',
      inputSchema: {},
      outputSchema: { type: 'array', items: { type: 'object' } },
      route: '/todos/get',
    },
    {
      name: 'addTodo',
      description: 'Add a new todo task',
      inputSchema: { type: 'object', properties: { task: { type: 'string' } }, required: ['task'] },
      outputSchema: { type: 'object' },
      route: '/todos/add',
    },
    {
      name: 'markTodoDone',
      description: 'Mark a todo task as completed',
      inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      outputSchema: { type: 'object' },
      route: '/todos/done',
    },
    {
      name: 'deleteTodo',
      description: 'Delete a todo task by ID',
      inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
      outputSchema: { type: 'string' },
      route: '/todos/delete',
    },
  ]
});

const PORT = 3030;
app.listen(PORT, () => {
  console.log(`✅ MCP To-Do Server running at http://localhost:${PORT}`);
});
