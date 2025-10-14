**Mat89**

Mat89 es una aplicacion desarrollada por **fgm-dev** para sustituir a la antigua base de datos Matricula89, creada en Microsoft Access, la cual ha dejado de utilizarse debido a restricciones de licencia.

La nueva solución está implementada con ReactJS en el frontend y Supabase como backend. Se trata de una aplicación web con un diseño moderno y minimalista, pensada para gestionar el envío y la recepción de piezas que se mandan a reparar, ya sea a destinos internos o externos.

*Funcionalidades principales*
La aplicación se organiza en varias secciones:

- Pedidos: permite registrar los pedidos de piezas que se envían a reparación.

- Recepciones: gestiona la recepción de materiales ya reparados.

- Proveedores y Materiales: secciones auxiliares para mantener actualizada la información de estos elementos.

- Consultar: ofrece una vista general de todos los envíos realizados y su estado actual.

- Datos capturados: funcionalidad de prueba para cargar datos recogidos en campo mediante archivos .csv, que se incorporan en la sección Pedidos > Líneas de pedido.

*Seguridad y acceso*
El acceso a la aplicación está protegido mediante una página de login. Solo los usuarios invitados mediante correo electrónico podrán acceder, lo que garantiza un entorno seguro y restringido.

*Roles de usuario*
Los usuarios tendran diferentes niveles de acceso según su rol, que puede ser Administrador, Editor o Consultas:

- Administrador: 
    - Control total de la aplicación.
    - Gestión de roles y permisos de los usuarios.
    - Acceso completo a las funciones de alta, modificación, eliminación y consulta (CRUD) en las secciones Pedidos, Recepciones, Proveedores y Materiales.

- Editor:
    - Acceso a todas las funciones CRUD en las secciones mencionadas, excepto la gestión de usuarios.

- Consultas:
    - Acceso únicamente a la sección Consultar, donde puede revisar el estado de los materiales enviados y recibidos.
