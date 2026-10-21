-- Script de datos de prueba (fixtures) para catálogo de especies, recintos, animales y eventos
-- Entorno: arca_pruebas (MySQL 8.0.x / 8.4.x)
-- Creado por: Víctor Adrián (Responsable de BD)
-- Tarea: T-01 (mobile-003: api-read-integration)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Limpiar datos previos de catálogo y eventos de prueba
DELETE FROM events WHERE id IN (1, 2, 3);
DELETE FROM animals WHERE id IN (1, 2, 3, 4, 5);
DELETE FROM species WHERE id IN (1, 2, 3, 4, 5);
DELETE FROM enclosures WHERE id IN (1, 2, 3);

-- 2. Recintos (enclosures)
INSERT INTO enclosures (id, name) VALUES
(1, 'Zona de Felinos y Sabana'),
(2, 'Aviario Tropical'),
(3, 'Herpetario y Humedales');

-- 3. Especies (species)
INSERT INTO species (
    id, common_name, scientific_name, category, distribution, 
    conservation_status, habitat, gestation_period, size_cm, model_3d_path
) VALUES
(
    1, 'Jaguar', 'Panthera onca', 'mammal', 'Sureste de México y Centroamérica',
    'Casi amenazado', 'Selva tropical y bosques húmedos', '93-105 días', 180, 'models/jaguar.glb'
),
(
    2, 'León Africano', 'Panthera leo', 'mammal', 'África subsahariana',
    'Vulnerable', 'Sabana y pastizales abiertos', '110 días', 200, 'models/lion.glb'
),
(
    3, 'Guacamaya Verde', 'Ara militaris', 'bird', 'Sierras y selvas de México',
    'En peligro', 'Cañones de selva seca y templada', '28 días de incubación', 75, 'models/macaw.glb'
),
(
    4, 'Cocodrilo de Pantano', 'Crocodylus moreletii', 'reptile', 'Golfo de México y Península de Yucatán',
    'Preocupación menor', 'Cuerpos de agua dulce y pantanos', '75-85 días de incubación', 300, 'models/crocodile.glb'
),
(
    5, 'Nutria Neotropical', 'Lontra longicaudis', 'mammal', 'Ríos de Hidalgo y vertientes mexicanas',
    'Casi amenazado', 'Ríos de corriente rápida y lagunas', '60-70 días', 110, 'models/otter.glb'
);

-- 4. Animales en exhibición (animals)
INSERT INTO animals (
    id, responsible_id, name, sex, age, origin, longevity, reproduction, 
    diet, characteristics, photo_path, entry_date, entry_time, enclosure_id, 
    species_id, can_receive_visits, stay_status
) VALUES
(
    1, 1, 'Balam', 'M', '5 años', 'Rescate PROFEPA', '12-15 años en libertad, hasta 20 bajo cuidado profesional', 'Vivíparo',
    'Carnívoro estricto: carne de res, pollo y enriquecimiento alimentario.',
    'Pelaje dorado con rosetas distintivas, gran agilidad y fuerza en mandíbula.',
    'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=800&q=80',
    '2023-01-15', '10:00:00', 1, 1, 1, 'active'
),
(
    2, 1, 'Simba', 'M', '7 años', 'Intercambio zoológico registrado', '10-14 años', 'Vivíparo',
    'Carnívoro: raciones balanceadas de res con suplementos minerales.',
    'Melenudo imponente, temperamento sereno y vigilante de su manada.',
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
    '2022-05-20', '09:30:00', 1, 2, 1, 'active'
),
(
    3, 1, 'Kukul', 'F', '3 años', 'Donación de santuario certificado', '50-60 años', 'Ovíparo',
    'Frugívora y granívora: semillas de girasol, nueces, frutas frescas de temporada.',
    'Plumaje verde brillante con tonos rojos en la frente y plumas remeras azules.',
    'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=80',
    '2023-08-10', '11:15:00', 2, 3, 1, 'active'
),
(
    4, 1, 'Tlaloc', 'M', '12 años', 'Decomiso ambiental', '60-70 años', 'Ovíparo',
    'Carnívoro: pescado fresco, pollo y roedores enteros.',
    'Hocico ancho y aplanado, escamas dorsales prominentes y ojos adaptados a inmersión.',
    'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80',
    '2021-11-04', '14:00:00', 3, 4, 1, 'active'
),
(
    5, 1, 'Maya', 'F', '2 años', 'Nacida bajo cuidado humano', '10-12 años', 'Vivíparo',
    'Piscívora: truchas, mojarras y crustáceos de agua dulce.',
    'Cuerpo hidrodinámico alargado, cola gruesa y pelaje denso impermeable.',
    'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=800&q=80',
    '2024-02-18', '08:45:00', 3, 5, 1, 'active'
);

-- 5. Eventos y actividades del zoológico (events)
INSERT INTO events (
    id, name, description, image_path, start_date, end_date, 
    start_time, end_time, location, is_active, author_id
) VALUES
(
    1, 'Plática Educativa de Felinos',
    'Charla interactiva impartida por nuestros médicos veterinarios sobre la conservación y hábitos del jaguar en México.',
    'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80',
    CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), '12:00:00', '12:45:00',
    'Recinto de Felinos Mayores', 1, 1
),
(
    2, 'Taller Infantil de Huellas y Fósiles',
    'Taller lúdico para niñas y niños donde aprenderán a identificar huellas de la fauna regional y crearán una réplica de yeso.',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80',
    CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), '14:30:00', '15:30:00',
    'Aula Educativa del Parque', 1, 1
),
(
    3, 'Alimentación de Aves y Vuelo Demostrativo',
    'Observa de cerca cómo los cuidadores alimentan a las guacamayas y aprende sobre la importancia de las semillas en los bosques.',
    'https://images.unsplash.com/photo-1550853024-fae8dd4be47f?auto=format&fit=crop&w=800&q=80',
    CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), '16:00:00', '16:30:00',
    'Aviario Principal', 1, 1
);

SET FOREIGN_KEY_CHECKS = 1;
