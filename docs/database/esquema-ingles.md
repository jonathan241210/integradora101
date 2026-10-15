# Database Schema · Normalized (English)

> **Location:** `docs/database/esquema-ingles.md`  
> **Purpose:** Reference document for the normalized schema in English resulting from DBR-001.  
> **Review Mode:** Open `esquema-espanol.md` on the left pane and this file on the right pane in your IDE to compare side by side.

---

## 1. Table: `users` (Zoo Staff)
Represents institutional staff: directors, IT admins, cashiers, and veterinarians.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Unique identifier of employee | PRIMARY KEY |
| `first_name` | VARCHAR(100) | Given name | NOT NULL |
| `last_name` | VARCHAR(100) | First surname | NOT NULL |
| `second_last_name` | VARCHAR(100) | Second surname | NULL |
| `department_id` | INT | Department / workplace within the zoo | FOREIGN KEY → `departments(id)` |
| `last_login_at` | DATETIME | Timestamp of last login | NULL |
| `password` | VARCHAR(255) | Password hash | NOT NULL |

---

## 2. Table: `departments` (Organizational Departments)
Internal organizational departments and work areas.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Department unique identifier | PRIMARY KEY |
| `name` | VARCHAR(100) | Department name | NOT NULL |
| `description` | TEXT | Description of department functions | NULL |

---

## 3. Table: `visitors` (Mobile App Visitor Accounts)
Public visitors registered via the mobile application.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Unique identifier of visitor | PRIMARY KEY |
| `nickname` | VARCHAR(50) | Public nickname displayed in mobile app | NOT NULL |
| `email` | VARCHAR(150) | Electronic mail address for login | UNIQUE, NOT NULL |
| `first_name` | VARCHAR(100) | Given name | NOT NULL |
| `last_name` | VARCHAR(100) | First surname | NOT NULL |
| `second_last_name` | VARCHAR(100) | Second surname | NULL |
| `password` | VARCHAR(255) | Password hash | NOT NULL |
| `is_active` | TINYINT(1) | Account status flag (1=active, 0=inactive) | NOT NULL, DEFAULT 1 |

---

## 4. Table: `visitor_collections` (Visitor Discovery Collections)
Record of park species/elements unlocked by visitors.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Collection record identifier | PRIMARY KEY |
| `unlocked_date` | DATETIME | Date and time when unlocked | NOT NULL |
| `enclosure_qr_code_id` | INT | Scanned enclosure QR code | FOREIGN KEY → `enclosure_qr_codes(id)` |
| `visitor_id` | INT | Visitor who unlocked the entry | FOREIGN KEY → `visitors(id)` |

---

## 5. Table: `enclosures` (Habitats and Facilities)
Physical facilities and habitats where animals live.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Enclosure identifier | PRIMARY KEY |
| `name` | VARCHAR(100) | Enclosure name | NOT NULL |

---

## 6. Table: `enclosure_qr_codes` (Enclosure QR Scan Points)
Physical QR codes placed in animal enclosures.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | QR code identifier | PRIMARY KEY |
| `code` | VARCHAR(100) | Unique QR code payload / string | UNIQUE, NOT NULL |
| `is_active` | TINYINT(1) | Activation status (1=active, 0=inactive) | NOT NULL, DEFAULT 1 |
| `enclosure_id` | INT | Enclosure associated with this QR | FOREIGN KEY → `enclosures(id)` |

---

## 7. Table: `species` (Biological Species Catalog)
Taxonomic and biological catalog of zoo species.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Species identifier | PRIMARY KEY |
| `common_name` | VARCHAR(100) | Common vernacular name | NOT NULL |
| `scientific_name` | VARCHAR(150) | Latin scientific taxonomic name | NOT NULL |
| `distribution` | VARCHAR(255) | Natural geographic range | NULL |
| `conservation_status`| VARCHAR(100) | IUCN conservation red list category | NULL |
| `habitat` | VARCHAR(255) | Natural biome / habitat type | NULL |
| `gestation_period` | VARCHAR(100) | Incubation or gestation timeframe | NULL |
| `size_cm` | DECIMAL(8,2) | Average body length in centimeters | NULL |
| `model_3d_path` | VARCHAR(255) | Asset path to 3D model for mobile app | NULL |

---

## 8. Table: `animals` (Living Specimen Collection)
Individual animals sheltered in the zoo.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Specimen unique identifier | PRIMARY KEY |
| `tag_number` | VARCHAR(50) | Unique tag / microchip / ring number | UNIQUE, NOT NULL |
| `responsible_id` | INT | Responsible keeper/staff member | FOREIGN KEY → `users(id)` |
| `name` | VARCHAR(100) | Animal individual name | NOT NULL |
| `sex` | VARCHAR(20) | Biological sex (Male / Female / Undetermined)| NOT NULL |
| `age` | VARCHAR(50) | Estimated or exact age | NULL |
| `origin` | VARCHAR(100) | Provenance (donation, confiscation, rescue) | NULL |
| `longevity` | VARCHAR(50) | Estimated life expectancy | NULL |
| `reproduction` | VARCHAR(100) | Reproductive background | NULL |
| `diet` | TEXT | Nutritional diet regime | NULL |
| `characteristics` | TEXT | Physical traits and distinctive marks | NULL |
| `photo_path` | VARCHAR(255) | Photo asset path | NULL |
| `entry_date` | DATE | Date of zoo admission | NOT NULL |
| `entry_time` | TIME | Time of zoo admission | NULL |
| `enclosure_id` | INT | Assigned enclosure habitat | FOREIGN KEY → `enclosures(id)` |
| `species_id` | INT | Biological species | FOREIGN KEY → `species(id)` |
| `can_receive_visits` | TINYINT(1) | Visible for public display | NOT NULL, DEFAULT 1 |
| `stay_status` | VARCHAR(50) | Stay status (e.g. intake_quarantine) | NOT NULL |

---

## 9. Table: `animal_departures` (Specimen Departures and Losses)
Log of animal discharges, departures, transfers, or deaths.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Departure record identifier | PRIMARY KEY |
| `animal_id` | INT | Departing animal specimen | FOREIGN KEY → `animals(id)` |
| `departure_date` | DATE | Date of departure | NOT NULL |
| `departure_time` | TIME | Time of departure | NULL |
| `departure_status` | VARCHAR(100) | Reason or outcome (transfer, decease) | NOT NULL |

---

## 10. Table: `clinical_evaluations` (Veterinary Medical History)
Veterinary medical evaluations and examinations of animals.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Evaluation unique identifier | PRIMARY KEY |
| `animal_id` | INT | Evaluated animal specimen | FOREIGN KEY → `animals(id)` |
| `veterinarian_id` | INT | Responsible veterinary doctor | FOREIGN KEY → `users(id)` |
| `evaluation_type` | VARCHAR(100) | Medical exam category | NOT NULL |
| `evaluation_reason` | VARCHAR(100) | Purpose of evaluation (e.g. routine_check)| NOT NULL |
| `destination_ruling`| VARCHAR(100) | Final clinical outcome ruling | NULL |
| `assessment_reason` | TEXT | Detailed clinical justification | NULL |
| `evaluation_date` | DATE | Date of medical checkup | NOT NULL |
| `start_time` | TIME | Examination start time | NULL |
| `end_time` | TIME | Examination end time | NULL |
| `temperature_c` | DECIMAL(4,2) | Core body temperature in °C | NULL |
| `heart_rate` | INT | Heart beats per minute (BPM) | NULL |
| `respiratory_rate` | INT | Breaths per minute (RPM) | NULL |
| `capillary_refill_time` | INT | Capillary refill time in seconds | NULL |
| `weight_kg` | DECIMAL(8,2) | Body weight in kilograms | NULL |
| `attitude` | VARCHAR(100) | Clinical demeanor (alert, depressed) | NULL |
| `body_condition_score`| VARCHAR(50) | Body condition score index (e.g. 3/5) | NULL |
| `presumptive_diagnosis`| TEXT | Initial working presumptive diagnosis | NULL |
| `definitive_diagnosis` | TEXT | Final confirmed definitive diagnosis | NULL |
| `recommendations` | TEXT | Treatment plan and clinical instructions | NULL |
| `is_fit_for_wild_release`| TINYINT(1)| Qualified for wildlife reintroduction | NOT NULL, DEFAULT 0 |

---

## 11. Table: `clinical_evaluation_findings` (Organ System Findings)
Detailed medical findings categorized by organ system.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Finding unique identifier | PRIMARY KEY |
| `clinical_evaluation_id` | INT | Linked medical evaluation | FOREIGN KEY → `clinical_evaluations(id)` |
| `organ_system` | VARCHAR(100) | Assessed organ system (musculoskeletal, etc.) | NOT NULL |
| `status` | VARCHAR(50) | System status (normal, abnormal) | NOT NULL |
| `description` | TEXT | Detailed medical description of abnormality | NULL |

---

## 12. Table: `animal_restraints` (Chemical and Physical Restraints)
Physical or chemical restraint events performed during procedures.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Restraint procedure identifier | PRIMARY KEY |
| `clinical_evaluation_id` | INT | Linked medical evaluation | FOREIGN KEY → `clinical_evaluations(id)` |
| `mobilization_type` | VARCHAR(100) | Mobilization classification | NOT NULL |
| `physical_method` | VARCHAR(100) | Physical tools or technique utilized | NULL |
| `drug` | VARCHAR(100) | Anesthetic or sedative drug administered | NULL |
| `dose_mg_per_kg` | DECIMAL(8,2) | Calculated dosage in mg/kg | NULL |
| `dose_ml` | DECIMAL(8,2) | Volume administered in milliliters | NULL |
| `administered_time` | TIME | Time of administration | NULL |
| `notes` | TEXT | Procedure observations and remarks | NULL |

---

## 13. Table: `lab_samples` (Laboratory Diagnostics)
Biological samples and laboratory workup results.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Sample unique identifier | PRIMARY KEY |
| `clinical_evaluation_id` | INT | Linked clinical evaluation | FOREIGN KEY → `clinical_evaluations(id)` |
| `sample_type` | VARCHAR(100) | Biological sample type (blood, feces, urine) | NOT NULL |
| `file_path` | VARCHAR(255) | Digital report asset path | NULL |
| `result_notes` | TEXT | Laboratory analysis notes and results | NULL |

---

## 14. Table: `news` (Institutional Communications)
News and announcements published on the public web portal.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | News item identifier | PRIMARY KEY |
| `title` | VARCHAR(200) | Article headline / title | NOT NULL |
| `description` | TEXT | Brief editorial summary or subhead | NULL |
| `content` | LONGTEXT | Full article body content | NOT NULL |
| `image_path` | VARCHAR(255) | Featured banner image asset path | NULL |
| `published_date` | DATE | Official publishing date | NOT NULL |
| `start_date` | DATE | Effective start display date | NULL |
| `end_date` | DATE | Effective end display date | NULL |
| `category` | VARCHAR(100) | Editorial category | NOT NULL |
| `is_active` | TINYINT(1) | Publication status (1=active, 0=draft/inactive) | NOT NULL, DEFAULT 1 |
| `author_id` | INT | Author staff member | FOREIGN KEY → `users(id)` |

---

## 15. Table: `events` (Zoo Events and Public Activities)
Public events, workshops, and seasonal activities at the park.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Event identifier | PRIMARY KEY |
| `name` | VARCHAR(200) | Event name or title | NOT NULL |
| `description` | TEXT | Summary of event schedule and activities | NULL |
| `image_path` | VARCHAR(255) | Poster or promotional image asset path | NULL |
| `start_date` | DATE | Event start date | NOT NULL |
| `end_date` | DATE | Event conclusion date | NULL |
| `start_time` | TIME | Daily opening time | NULL |
| `end_time` | TIME | Daily closing time | NULL |
| `location` | VARCHAR(255) | Specific venue location inside the zoo | NULL |
| `is_active` | TINYINT(1) | Status (1=active, 0=canceled/inactive) | NOT NULL, DEFAULT 1 |
| `author_id` | INT | Event coordinator staff member | FOREIGN KEY → `users(id)` |

---

## 16. Table: `tickets` (Box Office Tickets)
In-person admission ticket sales at the box office.

| Column | Type | Description | Key / Constraint |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Printed serial folio number | PRIMARY KEY |
| `adult_quantity` | INT | Quantity of adult admissions | NOT NULL, DEFAULT 0 |
| `child_quantity` | INT | Quantity of child admissions | NOT NULL, DEFAULT 0 |
| `total_amount` | DECIMAL(10,2) | Total paid amount in MXN | NOT NULL |
| `purchased_at` | DATETIME | Exact transaction purchase timestamp | NOT NULL |
| `qr_code` | VARCHAR(255) | QR turnstile validation token string | NOT NULL |
| `cashier_id` | INT | Cashier staff member who sold the ticket | FOREIGN KEY → `users(id)` |
