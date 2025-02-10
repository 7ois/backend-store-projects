const express = require('express');
const app = express();
const userRouter = require('./routes/users_routes');
const roleRouter = require('./routes/role_routes');
const typeRouter = require('./routes/type_projects_routes');
const projectRouter = require('./routes/projects_routes');

const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json());


app.use('/api', userRouter);
app.use('/api', roleRouter);
app.use('/api', typeRouter);
app.use('/api', projectRouter);

module.exports = app;