const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Middleware para parsear JSON
app.use(express.json());

const cors = require('cors');
app.use(cors({ origin: '*' }));


// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: 'postgres', // Reemplaza con tu usuario de PostgreSQL
    host: 'localhost',
    database: 'postgres', // Reemplaza con el nombre de tu base de datos
    password: '12345', // Reemplaza con tu contraseña
    port: 5432, // Puerto por defecto de PostgreSQL
});



// Endpoint para crear un nuevo empleado
app.post('/crear-empleado', async (req, res) => {
    const {
        nombreCompleto,
        correoElectronico,
        contrasena,
        telefono,
        fechaNacimiento,
        direccion,
        rol_empresa,
        salario,
        fecha_ingreso,
    } = req.body;

    try {
        // Validación básica de los datos
        if (
            !nombreCompleto ||
            !correoElectronico ||
            !contrasena ||
            !telefono ||
            !fechaNacimiento ||
            !direccion ||
            !rol_empresa ||
            !salario ||
            !fecha_ingreso
        ) {
            return res.status(400).json({
                data: null,
                message: 'Todos los campos son obligatorios.',
                isValid: false,
            });
        }

        // Iniciar una transacción
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); // Inicia la transacción

            // Insertar en la tabla usuarios
            const insertUsuarioQuery = `
                INSERT INTO usuarios (
                    nombre_completo,
                    correo_electronico,
                    contrasena,
                    telefono,
                    fecha_nacimiento,
                    direccion,
                    tipo_usuario
                ) VALUES ($1, $2, $3, $4, $5, $6, 'Empleado') RETURNING id;
            `;
            const usuarioValues = [
                nombreCompleto,
                correoElectronico,
                contrasena,
                telefono,
                fechaNacimiento,
                direccion,
            ];

            const usuarioResult = await client.query(insertUsuarioQuery, usuarioValues);
            const usuarioId = usuarioResult.rows[0].id;

            // Insertar en la tabla empleados
            const insertEmpleadoQuery = `
                INSERT INTO empleados (
                    usuario_id,
                    rol_empresa,
                    salario,
                    fecha_ingreso
                ) VALUES ($1, $2, $3, $4);
            `;
            const empleadoValues = [usuarioId, rol_empresa, salario, fecha_ingreso];

            await client.query(insertEmpleadoQuery, empleadoValues);

            await client.query('COMMIT'); // Confirmar la transacción

            res.status(201).json({
                data: {
                    usuarioId,
                    nombreCompleto,
                    correoElectronico,
                    rol_empresa,
                    salario,
                    fecha_ingreso,
                },
                message: 'Empleado creado con éxito.',
                isValid: true,
            });
        } catch (error) {
            await client.query('ROLLBACK'); // Revertir la transacción en caso de error
            console.error('Error al crear el empleado:', error);

            // Manejo de errores como violaciones de clave única
            if (error.code === '23505') {
                return res.status(400).json({
                    data: null,
                    message: 'El correo electrónico ya está en uso.',
                    isValid: false,
                });
            }

            res.status(500).json({
                data: null,
                message: 'Error interno del servidor.',
                isValid: false,
            });
        } finally {
            client.release(); // Liberar la conexión al pool
        }
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

// Endpoint para actualizar un empleado
app.post('/actualizar_empleado', async (req, res) => {
    const {
        id,
        nombre_completo,
        correo_electronico,
        telefono,
        fecha_nacimiento,
        direccion,
        rol_empresa,
        salario,
        fecha_ingreso,
        contrasena,  // Si se quiere actualizar la contraseña
    } = req.body;

    try {
        // Validación básica de los datos
        if (
            !nombre_completo ||
            !correo_electronico ||
            !telefono ||
            !fecha_nacimiento ||
            !direccion ||
            !rol_empresa ||
            !salario ||
            !fecha_ingreso
        ) {
            return res.status(400).json({
                data: null,
                message: 'Todos los campos son obligatorios.',
                isValid: false,
            });
        }

        // Iniciar una transacción
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); // Inicia la transacción

            // Si se incluye la contraseña, se actualizará
            let updateUsuarioQuery = `
                UPDATE usuarios
                SET nombre_completo = $1,
                    correo_electronico = $2,
                    telefono = $3,
                    fecha_nacimiento = $4,
                    direccion = $5
            `;
            const usuarioValues = [
                nombre_completo,
                correo_electronico,
                telefono,
                fecha_nacimiento,
                direccion,
            ];

            // Si se envió la contraseña, actualizamos también ese campo
            if (contrasena) {
                updateUsuarioQuery += `, contrasena = $6`;
                usuarioValues.push(contrasena);
            }

            updateUsuarioQuery += ` WHERE id = $7 RETURNING id;`;
            usuarioValues.push(id); // Agregar el ID del usuario a los valores

            const usuarioResult = await client.query(updateUsuarioQuery, usuarioValues);

            // Verificar si el usuario existe
            if (usuarioResult.rowCount === 0) {
                return res.status(404).json({
                    data: null,
                    message: 'Empleado no encontrado.',
                    isValid: false,
                });
            }

            // Actualizar los datos del empleado
            const updateEmpleadoQuery = `
                UPDATE empleados
                SET rol_empresa = $1,
                    salario = $2,
                    fecha_ingreso = $3
                WHERE usuario_id = $4;
            `;
            const empleadoValues = [rol_empresa, salario, fecha_ingreso, id];

            await client.query(updateEmpleadoQuery, empleadoValues);

            await client.query('COMMIT'); // Confirmar la transacción

            res.status(200).json({
                data: {
                    id,
                    nombre_completo,
                    correo_electronico,
                    rol_empresa,
                    salario,
                    fecha_ingreso,
                },
                message: 'Empleado actualizado con éxito.',
                isValid: true,
            });
        } catch (error) {
            await client.query('ROLLBACK'); // Revertir la transacción en caso de error
            console.error('Error al actualizar el empleado:', error);

            res.status(500).json({
                data: null,
                message: 'Error interno del servidor.',
                isValid: false,
            });
        } finally {
            client.release(); // Liberar la conexión al pool
        }
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});



// Endpoint para validar el inicio de sesión
app.post('/login', async (req, res) => {
    const { correoElectronico, contrasena } = req.body;

    try {
        // Validación básica de los datos
        if (!correoElectronico || !contrasena) {
            return res.status(400).json({
                data: null,
                message: 'Correo electrónico y contraseña son obligatorios.',
                isValid: false,
            });
        }

        // Consulta para verificar las credenciales del usuario
        const query = `
            SELECT * FROM public.usuarios
            WHERE correo_electronico = $1 AND contrasena = $2;
        `;

        const values = [correoElectronico, contrasena];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            // Si no se encuentran coincidencias

            console.log('No entro');

            return res.status(401).json({
                data: null,
                message: 'Correo electrónico o contraseña incorrectos.',
                isValid: false,
            });
        }

        // Si las credenciales son válidas, devolver información del usuario
        res.status(200).json({
            data: {
                idUsuario: result.rows[0].id_usuario,
                nombreCompleto: result.rows[0].nombre_completo,
                correoElectronico: result.rows[0].correo_electronico,
                telefono: result.rows[0].telefono,
                tipoMembresia: result.rows[0].tipo_membresia,
            },
            message: 'Inicio de sesión exitoso.',
            isValid: true,
        });
    } catch (error) {
        console.error('Error al validar el inicio de sesión:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});





app.get('/usuarios-empleados', async (req, res) => {

    console.log('Entro al backend');

    const query = `
        SELECT 
            a.id AS id,
            a.nombre_completo AS nombre_completo,
            a.correo_electronico AS correo_electronico,
            a.contrasena AS contrasena,
            a.telefono AS telefono,
            a.fecha_nacimiento AS fecha_nacimiento,
            a.direccion AS direccion,
            a.tipo_usuario AS tipo_usuario,
            e.rol_empresa AS rol_empresa,
            e.salario AS salario,
            e.fecha_ingreso AS fecha_ingreso
        FROM usuarios a
        INNER JOIN empleados e ON e.usuario_id = a.id;
    `;

    try {
        const result = await pool.query(query);
        res.status(200).json(result.rows); // Enviar solo los datos
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        res.status(500).json([]); // Devolver un array vacío en caso de error
    }
});

// Endpoint para obtener el detalle de un empleado por ID
app.get('/obtener_detelle_empleado/:id', async (req, res) => {

    console.log('Entro al detalle del empleado');

    const { id } = req.params; // Obtener el ID del empleado desde los parámetros de la URL

    const query = `
        SELECT 
            a.id AS id,
            a.nombre_completo AS nombre_completo,
            a.correo_electronico AS correo_electronico,
            a.contrasena AS contrasena,
            a.telefono AS telefono,
            a.fecha_nacimiento AS fecha_nacimiento,
            a.direccion AS direccion,
            a.tipo_usuario AS tipo_usuario,
            e.rol_empresa AS rol_empresa,
            e.salario AS salario,
            e.fecha_ingreso AS fecha_ingreso
        FROM usuarios a
        INNER JOIN empleados e ON e.usuario_id = a.id
        WHERE a.id = $1;
    `;

    try {
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            // Si no se encuentra el usuario con el ID proporcionado
            return res.status(404).json(
            null

            );
        }

        // Enviar la información del usuario
        res.status(200).json(
   result.rows[0]

        );
    } catch (error) {
        console.error('Error al obtener el detalle del usuario empleado:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

// Endpoint para eliminar un empleado por ID
app.get('/eliminar_empleado/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del empleado desde los parámetros de la URL

    console.log(`Solicitando eliminar el empleado con ID: ${id}`);

    // Primero verifica si el empleado existe
    const checkQuery = `
        SELECT * FROM usuarios 
        WHERE id = $1;
    `;

    const deleteQuery = `
        DELETE FROM usuarios 
        WHERE id = $1;
    `;

    try {
        // Verificar si el empleado existe
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            // Si el empleado no existe, devolver un error 404
            return res.status(404).json({
                message: `No se encontró el empleado con ID ${id}.`,
                isValid: false,
            });
        }

        // Eliminar el empleado
        await pool.query(deleteQuery, [id]);
        console.log(`Empleado con ID ${id} eliminado con éxito.`);

        res.status(200).json({
            message: `Empleado con ID ${id} eliminado con éxito.`,
            isValid: true,
        });
    } catch (error) {
        console.error('Error al eliminar el empleado:', error);
        res.status(500).json({
            message: 'Error interno del servidor al eliminar el empleado.',
            isValid: false,
        });
    }
});



// Endpoint para crear un cliente
app.post('/crear-cliente', async (req, res) => {
    const {
        nombreCompleto,
        correoElectronico,
        contrasena,
        telefono,
        fechaNacimiento,
        direccion,
        tipoMembresia,
        tipoDinamica,
        fechaInicioMembresia,
    } = req.body;

    try {
        // Validación básica de los datos
        if (
            !nombreCompleto ||
            !tipoDinamica ||
            !correoElectronico ||
            !contrasena ||
            !telefono ||
            !fechaNacimiento ||
            !direccion ||
            !tipoMembresia ||
            !fechaInicioMembresia
        ) {
            return res.status(400).json({
                data: null,
                message: 'Todos los campos son obligatorios.',
                isValid: false,
            });
        }

        // Función para calcular la fecha de finalización de la membresía
        const calcularFechaFinMembresia = (tipoMembresia, fechaInicio) => {
            const fechaInicioDate = new Date(fechaInicio);
            switch (tipoMembresia.toLowerCase()) {
                case 'dia':
                    fechaInicioDate.setDate(fechaInicioDate.getDate() + 1);
                    return fechaInicioDate.toISOString();
                case 'mensual':
                    fechaInicioDate.setMonth(fechaInicioDate.getMonth() + 1);
                    return fechaInicioDate.toISOString();
                case 'anual':
                    fechaInicioDate.setFullYear(fechaInicioDate.getFullYear() + 1);
                    return fechaInicioDate.toISOString();
                case 'vip':
                    return null; // Sin fecha de finalización
                default:
                    throw new Error('Tipo de membresía no válido.');
            }
        };

        const fechaFinMembresia = calcularFechaFinMembresia(tipoMembresia, fechaInicioMembresia);

        // Iniciar una transacción
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); // Inicia la transacción

            // Insertar en la tabla usuarios
            const insertUsuarioQuery = `
                INSERT INTO usuarios (
                    nombre_completo,
                    correo_electronico,
                    contrasena,
                    telefono,
                    fecha_nacimiento,
                    direccion,
                    tipo_usuario
                ) VALUES ($1, $2, $3, $4, $5, $6, 'Cliente') RETURNING id;
            `;
            const usuarioValues = [
                nombreCompleto,
                correoElectronico,
                contrasena,
                telefono,
                fechaNacimiento,
                direccion,
            ];

            const usuarioResult = await client.query(insertUsuarioQuery, usuarioValues);
            const usuarioId = usuarioResult.rows[0].id;

            // Insertar en la tabla clientes
            const insertClienteQuery = `
                INSERT INTO clientes (
                    usuario_id,
                    tipo_membresia,
                    fecha_inicio_membresia,
                    fecha_fin_membresia,
                    tipo_dinamica
                ) VALUES ($1, $2, $3, $4, $5);
            `;
            const clienteValues = [usuarioId, tipoMembresia, fechaInicioMembresia, fechaFinMembresia,tipoDinamica];

            await client.query(insertClienteQuery, clienteValues);

            await client.query('COMMIT'); // Confirmar la transacción

            res.status(201).json({
                data: {
                    usuarioId,
                    nombreCompleto,
                    correoElectronico,
                    tipoMembresia,
                    fechaInicioMembresia,
                    fechaFinMembresia,
                },
                message: 'Cliente creado con éxito.',
                isValid: true,
            });
        } catch (error) {
            await client.query('ROLLBACK'); // Revertir la transacción en caso de error
            console.error('Error al crear el cliente:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    data: null,
                    message: 'El correo electrónico ya está en uso.',
                    isValid: false,
                });
            }

            res.status(500).json({
                data: null,
                message: 'Error interno del servidor.',
                isValid: false,
            });
        } finally {
            client.release(); // Liberar la conexión al pool
        }
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

// Endpoint para obtener todos los clientes
app.get('/clientes', async (req, res) => {
    console.log('entro a la lista de clientes');
    const query = `
        SELECT 
            u.id,
            u.nombre_completo,
            u.correo_electronico,
            u.telefono,
            u.fecha_nacimiento,
            u.direccion,
            c.tipo_membresia,
            c.fecha_inicio_membresia,
            c.fecha_fin_membresia
        FROM usuarios u
        INNER JOIN clientes c ON c.usuario_id = u.id;
    `;

    try {
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        res.status(500).json([]);
    }
});

// Endpoint para obtener el detalle de un cliente por ID
app.get('/detalle_cliente/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del cliente desde los parámetros de la URL

    const query = `
        SELECT 
            u.id,
            u.nombre_completo,
            u.correo_electronico,
            u.contrasena,
            u.telefono,
            u.fecha_nacimiento,
            u.direccion,
            c.tipo_membresia,
            c.fecha_inicio_membresia,
            c.fecha_fin_membresia,
            c.tipo_dinamica
        FROM usuarios u
        INNER JOIN clientes c ON c.usuario_id = u.id
        WHERE u.id = $1;
    `;

    try {
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            // Si no se encuentra el cliente con el ID proporcionado
            return res.status(404).json({
                data: null,
                message: `No se encontró un cliente con el ID ${id}.`,
                isValid: false,
            });
        }

        // Enviar la información del cliente
        res.status(200).json(
           result.rows[0]
        );
    } catch (error) {
        console.error('Error al obtener el detalle del cliente:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

// Endpoint para actualizar un cliente
app.post('/actualizar-cliente', async (req, res) => {
    const {
        id,
        nombre_completo,
        correo_electronico,
        contrasena,
        telefono,
        fecha_nacimiento,
        direccion,
        tipo_membresia,
        tipo_dinamica,
        fecha_inicio_membresia,
    } = req.body;

    try {
        // Validación básica de los datos
        if (
            !id ||
            !nombre_completo ||
            !correo_electronico ||
            !contrasena ||
            !telefono ||
            !fecha_nacimiento ||
            !direccion ||
            !tipo_membresia ||
            !fecha_inicio_membresia
        ) {
            return res.status(400).json({
                data: null,
                message: 'Todos los campos son obligatorios.',
                isValid: false,
            });
        }

        // Función para calcular la fecha de finalización de la membresía
        const calcularFechaFinMembresia = (tipoMembresia, fechaInicio) => {
            const fechaInicioDate = new Date(fechaInicio);
            switch (tipoMembresia.toLowerCase()) {
                case 'dia':
                    fechaInicioDate.setDate(fechaInicioDate.getDate() + 1);
                    return fechaInicioDate.toISOString();
                case 'mensual':
                    fechaInicioDate.setMonth(fechaInicioDate.getMonth() + 1);
                    return fechaInicioDate.toISOString();
                case 'anual':
                    fechaInicioDate.setFullYear(fechaInicioDate.getFullYear() + 1);
                    return fechaInicioDate.toISOString();
                case 'vip':
                    return null; // Sin fecha de finalización
                default:
                    throw new Error('Tipo de membresía no válido.');
            }
        };

        const fechaFinMembresia = calcularFechaFinMembresia(tipo_membresia, fecha_inicio_membresia);

        // Iniciar una transacción
        const client = await pool.connect();

        try {
            await client.query('BEGIN'); // Inicia la transacción

            // Actualizar en la tabla usuarios
            const updateUsuarioQuery = `
                UPDATE usuarios
                SET
                    nombre_completo = $1,
                    correo_electronico = $2,
                    contrasena = $3,
                    telefono = $4,
                    fecha_nacimiento = $5,
                    direccion = $6
                WHERE id = $7;
            `;
            const usuarioValues = [
                nombre_completo,
                correo_electronico,
                contrasena,
                telefono,
                fecha_nacimiento,
                direccion,
                id, // Usamos el ID del cliente para actualizar el usuario correspondiente
            ];

            await client.query(updateUsuarioQuery, usuarioValues);

            // Actualizar en la tabla clientes
            const updateClienteQuery = `
                UPDATE clientes
                SET
                    tipo_membresia = $1,
                    fecha_inicio_membresia = $2,
                    fecha_fin_membresia = $3,
                    tipo_dinamica = $4
                WHERE usuario_id = $5;
            `;
            const clienteValues = [
                tipo_membresia,
                fecha_inicio_membresia,
                fechaFinMembresia,
                tipo_dinamica,
                id, // Usamos el ID del cliente para actualizar los datos correspondientes
            ];

            await client.query(updateClienteQuery, clienteValues);

            await client.query('COMMIT'); // Confirmar la transacción

            res.status(200).json({
                data: {
                    id,
                    nombre_completo,
                    correo_electronico,
                    tipo_membresia,
                    fecha_inicio_membresia,
                    fecha_fin_membresia: fechaFinMembresia,
                },
                message: 'Cliente actualizado con éxito.',
                isValid: true,
            });
        } catch (error) {
            await client.query('ROLLBACK'); // Revertir la transacción en caso de error
            console.error('Error al actualizar el cliente:', error);

            if (error.code === '23505') {
                return res.status(400).json({
                    data: null,
                    message: 'El correo electrónico ya está en uso.',
                    isValid: false,
                });
            }

            res.status(500).json({
                data: null,
                message: 'Error interno del servidor.',
                isValid: false,
            });
        } finally {
            client.release(); // Liberar la conexión al pool
        }
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

// Endpoint para eliminar un cliente por ID
app.get('/eliminar_cliente/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID del cliente desde los parámetros de la URL

    // Iniciar una transacción
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia la transacción

        // Eliminar registros en la tabla clientes
        const deleteClienteQuery = `
            DELETE FROM clientes
            WHERE usuario_id = $1;
        `;
        await client.query(deleteClienteQuery, [id]);

        // Eliminar registros en la tabla usuarios
        const deleteUsuarioQuery = `
            DELETE FROM usuarios
            WHERE id = $1;
        `;
        await client.query(deleteUsuarioQuery, [id]);

        await client.query('COMMIT'); // Confirmar la transacción

        // Responder con éxito
        res.status(200).json({
            data: null,
            message: `Cliente con ID ${id} eliminado con éxito.`,
            isValid: true,
        });
    } catch (error) {
        await client.query('ROLLBACK'); // Revertir la transacción en caso de error
        console.error('Error al eliminar el cliente:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor al eliminar el cliente.',
            isValid: false,
        });
    } finally {
        client.release(); // Liberar la conexión al pool
    }
});


app.post('/crear-equipos', async (req, res) => {

    console.log('entro al crear equipos');
    
    const { nombre, modelo, descripcion, estado, peso } = req.body;                                         

    try {
        // Validación básica
        if (!nombre || !modelo || !estado || !peso) {
            return res.status(400).json({
                data: null,
                message: 'Los campos nombre, modelo, estado y peso son obligatorios.',
                isValid: false,
            });
        }

        // Inserción en la base de datos
        const query = `
            INSERT INTO equipos (nombre, modelo, descripcion, estado, peso)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [nombre, modelo, descripcion || null, estado, peso];

        const result = await pool.query(query, values);

        res.status(201).json({
            data: result.rows[0],
            message: 'Equipo creado con éxito.',
            isValid: true,
        });
    } catch (error) {
        console.error('Error al crear el equipo:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

/**
 * Ruta para listar todos los equipos
 */
app.get('/equipos', async (req, res) => {
    try {

        console.log('entro al listado del inventario');
        
        const result = await pool.query('select id, nombre, modelo, descripcion, fecha_registro, estado, peso from equipos ORDER BY id;');

        res.status(200).json(
            result.rows
        );
    } catch (error) {
        console.error('Error al listar los equipos:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});

app.get('/obtener_detalle_equipos/:id', async (req, res) => {
    const { id } = req.params; // Capturamos el parámetro `id` de la URL

    console.log('ENTRO AL DETALLE DEL INVENTARIO')

    try {
        console.log(`Obteniendo detalles del equipo con ID: ${id}`);

        // Consulta para obtener el detalle del equipo
        const query = `
            SELECT id, nombre, modelo, descripcion, fecha_registro, estado, peso 
            FROM equipos 
            WHERE id = $1;
        `;
        const result = await pool.query(query, [id]); // Usamos parámetros para evitar inyección SQL

        // Verificamos si el equipo existe
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: `No se encontró el equipo con ID: ${id}`,
                isValid: false,
            });
        }

        // Devolvemos los detalles del equipo
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener el detalle del equipo:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});


app.post('/actualizar_productos', async (req, res) => {
    const { id,nombre, modelo, descripcion, fecha_registro, estado, peso } = req.body;

    console.log('entro en actualizar producto');

    try {
        // Validación de datos básicos
        if (!id || !nombre || !modelo || !descripcion || !fecha_registro || !estado || !peso) {
            return res.status(400).json({
                data: null,
                message: 'Todos los campos son obligatorios.',
                isValid: false,
            });
        }

        // Actualizar los datos en la base de datos
        const query = `
            UPDATE equipos
            SET 
                nombre = $1,
                modelo = $2,
                descripcion = $3,
                fecha_registro = $4,
                estado = $5,
                peso = $6
            WHERE id = $7
        `;

        const values = [
            nombre,
            modelo,
            descripcion,
            fecha_registro,
            estado,
            peso,
            id,
        ];

        const result = await pool.query(query, values);

        // Comprobar si algún registro fue afectado
        if (result.rowCount === 0) {
            return res.status(404).json({
                data: null,
                message: `No se encontró un equipo con el ID ${id}.`,
                isValid: false,
            });
        }

        res.status(200).json({
            data: { id, nombre, modelo, descripcion, fecha_registro, estado, peso },
            message: 'Equipo actualizado con éxito.',
            isValid: true,
        });
    } catch (error) {
        console.error('Error al actualizar el equipo:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});



app.get('/eliminar_productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM equipos WHERE id = $1;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                data: null,
                message: `No se encontró un producto con el ID ${id}.`,
                isValid: false,
            });
        }

        res.status(200).json({
            data: null,
            message: `Producto con ID ${id} eliminado con éxito.`,
            isValid: true,
        });
    } catch (error) {
        console.error('Error al eliminar el producto:', error);
        res.status(500).json({
            data: null,
            message: 'Error interno del servidor.',
            isValid: false,
        });
    }
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
