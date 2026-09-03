-- ============================================================================
-- BLOOM & BONSAI — Complete Database Schema & High-Res Seed Data
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `categories` (`id`, `name`, `slug`, `description`) VALUES
(1, 'Bonsai Trees', 'bonsai-trees', 'Artisanal, hand-sculpted ancient bonsai specimens.'),
(2, 'Flowering Plants', 'flowering-plants', 'Vibrant tropical and fragrant indoor blooming plants.'),
(3, 'Gardening Tools & Pots', 'accessories', 'Premium tools, organic fertilizers, and handcrafted ceramic pots.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `scientific_name` VARCHAR(255) DEFAULT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `old_price` DECIMAL(10,2) DEFAULT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `image2` VARCHAR(500) DEFAULT NULL,
  `image3` VARCHAR(500) DEFAULT NULL,
  `stock` INT DEFAULT 10,
  `badge` VARCHAR(50) DEFAULT NULL,
  `plant_age` VARCHAR(50) DEFAULT '2 Years',
  `max_height` VARCHAR(50) DEFAULT '45 cm',
  `bloom_time` VARCHAR(50) DEFAULT 'Spring to Summer',
  `light_needs` VARCHAR(100) DEFAULT 'Bright Indirect Light',
  `water_needs` VARCHAR(100) DEFAULT 'Moderate (2x / week)',
  `soil_type` VARCHAR(100) DEFAULT 'Well-draining Organic Blend',
  `care_level` VARCHAR(50) DEFAULT 'Moderate',
  `care_plan` JSON DEFAULT NULL,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

TRUNCATE TABLE `products`;

INSERT INTO `products` (`id`, `category_id`, `name`, `scientific_name`, `description`, `price`, `old_price`, `image`, `stock`, `badge`, `care_level`, `care_plan`) VALUES
(1, 1, 'Sculpted Juniper Bonsai', 'Juniperus procumbens', 'Gracefully twisted trunk with lush evergreen foliage. Symbolizes strength and peace.', 4500.00, 5200.00, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800', 15, 'Best Seller', 'Easy', '[{"week":1,"title":"Adaptation","tasks":"Place in bright indirect sunlight. Water when top inch of soil is dry."},{"week":2,"title":"Foliage Pruning","tasks":"Pinch back new shoots to retain classic cloud shape."},{"week":3,"title":"Nutrition Boost","tasks":"Apply diluted liquid organic bonsai food."},{"week":4,"title":"Root Check","tasks":"Ensure drainage hole is free of debris."}]'),
(2, 1, 'Ficus Ginseng Bonsai', 'Ficus microcarpa', 'Thick bulbous root system with glossy dark green leaves. Extremely hardy for beginners.', 3800.00, 4200.00, 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=800', 12, 'Popular', 'Easy', '[{"week":1,"title":"Placement","tasks":"Provide warm temperature above 18 C."},{"week":2,"title":"Misting","tasks":"Mist foliage daily to increase humidity."},{"week":3,"title":"Trimming","tasks":"Trim leggy stems to encourage bushiness."},{"week":4,"title":"Soil Feed","tasks":"Feed with balanced NPK liquid fertilizer."}]'),
(3, 2, 'Red Anthurium (Flamingo Flower)', 'Anthurium andraeanum', 'Exotic waxy red heart-shaped blooms with deep emerald leaves.', 2900.00, 3500.00, 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=800', 20, 'Hot Item', 'Moderate', '[{"week":1,"title":"Light Adjustment","tasks":"Keep in bright, filtered indoor sunlight."},{"week":2,"title":"Washing Leaves","tasks":"Wipe foliage with soft damp cloth to remove dust."},{"week":3,"title":"Bloom Care","tasks":"Deadhead faded blooms near stem base."},{"week":4,"title":"Soil Moisture","tasks":"Keep soil lightly moist but not soggy."}]'),
(4, 2, 'Crape Jasmine (Wathusudda)', 'Tabernaemontana divaricata', 'Pure white fragrant double-petaled tropical flowers.', 2200.00, 2600.00, 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=800', 18, 'Local Favorite', 'Easy', '[{"week":1,"title":"Sunlight Boost","tasks":"Give 4 hours of morning sun."},{"week":2,"title":"Pruning","tasks":"Prune tip branches to increase flowering branches."},{"week":3,"title":"Fertilizing","tasks":"Add bone meal or organic compost."},{"week":4,"title":"Pest Watch","tasks":"Check under leaves for whiteflies."}]'),
(5, 3, 'Bonsai Pruning Shears Tool Set', 'Stainless Steel Precision Shear', 'Hand-forged carbon steel precision pruning shears for leaf pinching and branch trimming.', 1500.00, 1800.00, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', 30, 'Essential Tool', 'Easy', NULL),
(6, 3, 'Handcrafted Terracotta Ceramic Pot', 'Artisan Clay Pot', 'Breathable porous ceramic pot with custom drainage tray.', 1200.00, 1500.00, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', 25, 'Handmade', 'Easy', NULL),
(7, 2, 'Tropical Peace Lily', 'Spathiphyllum wallisii', 'Elegant dark foliage with pure white spathe flowers.', 2700.00, 3100.00, 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800', 15, 'Air Purifier', 'Easy', NULL);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) DEFAULT 'customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`) VALUES
(1, 'Admin User', 'admin@bloombonsai.com', '$2y$10$92IXMO6546.fgFSYmB/4.OO9r.g9r.g9r.g9r.g9r.g9r.g9r.g9', 'admin'),
(2, 'Viduran', 'viduran@gmail.com', '$2y$10$92IXMO6546.fgFSYmB/4.OO9r.g9r.g9r.g9r.g9r.g9r.g9r.g9', 'customer')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

SET FOREIGN_KEY_CHECKS = 1;
