-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 12, 2025 at 09:07 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nod`
--

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activities`
--

INSERT INTO `activities` (`id`, `code`, `description`, `url`) VALUES
(1, 'MANAGE_USER', 'Add, Update, Delete of a user', '/member'),
(2, 'CHANGE_ROLE', 'Change a user’s role', '/change-role'),
(3, 'VIEW_AUDIT', 'View Audit logs', '/audit-logs'),
(4, 'CHANGE_PERMISSIONS', 'Who is having which acccess', '/change-permissions'),
(6, 'UPLOAD_DOC', 'To upload Doc', '/documents'),
(7, 'DELETE_DOC', 'Delete the documents', '/documents'),
(8, 'UPLOAD_TOPIC_DOC', 'Topics upload', '/topics'),
(9, 'DELETE_TOPIC_DOC', 'Delete Topics', '/topics'),
(10, 'SUBMIT_TOPIC', 'To submit topic proposal', '/propose-topic'),
(11, 'APPROVE_TOPIC', 'To approve topics', '/moderate-topics'),
(12, 'VIEW_ALL_TOPICS', 'See public and private Topics', '/topics'),
(13, 'MANAGE_TOPICS', 'Manage available topics', '/manage-topics'),
(14, 'SEND_NOTIFICATION', 'Send bulk notifications', '/notifications'),
(15, 'MANAGE_CAT', 'To manage avaialble categories', '/categories'),
(16, 'VIEW_PRIVATE_DOCS', 'To see the private docs', '/documents'),
(17, 'MANAGE_POLLS', 'create / edit / close / delete', '/polls'),
(18, 'POLL_GRAPHICS', 'Able to see the poll status while polling', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `activity_roles`
--

CREATE TABLE `activity_roles` (
  `activity_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_roles`
--

INSERT INTO `activity_roles` (`activity_id`, `role_id`) VALUES
(1, 1),
(2, 1),
(2, 3),
(3, 1),
(4, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1),
(10, 2),
(10, 3),
(10, 4),
(10, 5),
(10, 6),
(10, 7),
(10, 8),
(10, 9),
(11, 1),
(11, 3),
(11, 8),
(12, 1),
(12, 3),
(12, 4),
(12, 5),
(12, 6),
(12, 7),
(12, 8),
(13, 1),
(14, 1),
(15, 1),
(16, 1),
(17, 1),
(18, 1);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `performed_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `is_public`, `created_at`) VALUES
(1, 'EC Meeting', 1, '2025-07-06 03:28:33'),
(2, 'GC Meeting', 1, '2025-07-06 03:28:33'),
(3, 'BISOA Executive Meeting', 1, '2025-07-06 03:28:33'),
(7, 'holiday homes', 1, '2025-07-12 17:06:48');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `remarks` text DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `filepath` varchar(255) NOT NULL,
  `doc_date` date NOT NULL,
  `is_private` tinyint(1) NOT NULL DEFAULT 0,
  `uploaded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `user_id`, `category_id`, `title`, `remarks`, `filename`, `filepath`, `doc_date`, `is_private`, `uploaded_at`) VALUES
(10, 3, 1, 'sfakdl', 'saldfas', 'Receipt and Refund request.pdf', 'uploads\\docs\\Receipt and Refund request.pdf', '2025-07-15', 1, '2025-07-12 22:24:45'),
(11, 3, 2, 'asd', 'asdf', 'OpAccountSummaryUX311-07-2025.pdf', 'uploads\\docs\\OpAccountSummaryUX311-07-2025.pdf', '2025-07-13', 0, '2025-07-12 22:30:01'),
(13, 3, 7, 'asfas', 'sdafljn', 'OpAccountSummaryUX311-07-2025.pdf', 'uploads\\docs\\OpAccountSummaryUX311-07-2025.pdf', '2025-07-23', 0, '2025-07-12 23:16:59'),
(14, 3, 2, 'dadsfnjl', 'ndlaslf', 'Receipt and Refund request.pdf', 'uploads\\docs\\Receipt and Refund request.pdf', '2025-07-22', 0, '2025-07-12 23:18:18');

-- --------------------------------------------------------

--
-- Table structure for table `notification_jobs`
--

CREATE TABLE `notification_jobs` (
  `id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `channel` enum('EMAIL','TEXT') NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `status` enum('PENDING','SENT','FAILED') DEFAULT 'PENDING',
  `pdf_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_jobs`
--

INSERT INTO `notification_jobs` (`id`, `subject`, `body`, `channel`, `scheduled_at`, `created_by`, `created_at`, `status`, `pdf_path`) VALUES
(1, 'GBM Alert', 'It is informed that\r\n\r\n-Thanks and Regards\r\nROOOOOOOOO', 'EMAIL', '2025-07-05 17:07:48', 3, '2025-07-05 17:07:48', 'FAILED', NULL),
(2, 'GBM Alert', 'It is informed that\r\n\r\n-Thanks and Regards\r\nROOOOOOOOO', 'EMAIL', '2025-07-05 17:11:34', 3, '2025-07-05 17:11:34', 'SENT', NULL),
(3, 'GBM Alert on ', '<p>THis has been a&nbsp;</p><p>&nbsp;</p><p>asdadsa</p><p>&nbsp;</p><p>&nbsp;</p><p>Thanks and Regards</p><p>SHaik Masth</p><p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>', 'EMAIL', '2025-07-05 17:18:15', 3, '2025-07-05 17:18:15', 'SENT', NULL),
(4, 'checking', '<p>Hello gu</p><p>&nbsp;</p><ul><li><h2>Ta<i><strong>nas</strong></i>lj</h2></li><li>adsljsad</li></ul><p>shaik</p>', 'TEXT', '2025-07-05 17:35:52', 3, '2025-07-05 17:35:52', 'SENT', NULL),
(5, 'checking', '<p>asfasdfasfasfasa</p>', 'TEXT', '2025-07-05 20:53:00', 3, '2025-07-05 20:53:00', 'SENT', NULL),
(10, 'checking on ', '<p>Is this comeing</p><p>&nbsp;</p><p>&nbsp;</p><p>shaik ?</p>', 'EMAIL', '2025-07-05 22:25:03', 3, '2025-07-05 22:25:03', 'FAILED', 'uploads\\notifications\\1751734503684-saved_tentative.pdf'),
(11, 'checking on ', '<p>Is this comeing</p><p>&nbsp;</p><p>&nbsp;</p><p>shaik ?</p>', 'TEXT', '2025-07-05 22:25:03', 3, '2025-07-05 22:25:03', 'SENT', 'uploads\\notifications\\1751734503684-saved_tentative.pdf'),
(12, 'last time', '<p>is that solve all issues ?</p>', 'EMAIL', '2025-07-05 23:10:33', 3, '2025-07-05 23:10:33', 'FAILED', 'uploads\\notifications\\1751737232991-Nisha_Shah_Resume.pdf'),
(13, 'last time', '<p>is that solve all issues ?</p>', 'TEXT', '2025-07-05 23:10:33', 3, '2025-07-05 23:10:33', 'SENT', 'uploads\\notifications\\1751737232991-Nisha_Shah_Resume.pdf'),
(14, 'ABCD', '<p>abdkasnbfkjask</p>', 'EMAIL', '2025-07-05 23:13:05', 3, '2025-07-05 23:13:05', 'SENT', 'uploads\\notifications\\1751737385316-Demand_Notice_2024202137321187964T.pdf'),
(15, 'ABCD', '<p>abdkasnbfkjask</p>', 'TEXT', '2025-07-05 23:13:05', 3, '2025-07-05 23:13:05', 'SENT', 'uploads\\notifications\\1751737385316-Demand_Notice_2024202137321187964T.pdf'),
(16, 'Check 2', '<p>Helllooooooooooo</p>', 'TEXT', '2025-07-05 23:20:13', 3, '2025-07-05 23:20:13', 'SENT', NULL),
(18, 'morning guys', '<p>sandkjasdlasmkkjasdlmas</p>', 'TEXT', '2025-07-06 08:31:00', 3, '2025-07-06 08:28:33', 'SENT', NULL),
(19, 'check demo', '<p>checking in ITSD</p>', 'EMAIL', '2025-07-07 15:24:47', 3, '2025-07-07 15:24:47', 'FAILED', NULL),
(20, 'check demo', '<p>checking in ITSD</p>', 'TEXT', '2025-07-07 15:24:47', 3, '2025-07-07 15:24:47', 'SENT', NULL),
(21, 'Today', '<p>jaskdnaskdnfansjkn</p>', 'EMAIL', '2025-07-13 00:30:17', 3, '2025-07-13 00:30:17', 'SENT', 'uploads\\notifications\\1752346817012-Receipt_and_Refund_request.pdf'),
(22, 'Today', '<p>jaskdnaskdnfansjkn</p>', 'TEXT', '2025-07-13 00:30:17', 3, '2025-07-13 00:30:17', 'SENT', 'uploads\\notifications\\1752346817012-Receipt_and_Refund_request.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `notification_recipients`
--

CREATE TABLE `notification_recipients` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_recipients`
--

INSERT INTO `notification_recipients` (`id`, `job_id`, `user_id`, `is_read`) VALUES
(6, 5, 71002, 1),
(22, 10, 3, 1),
(23, 10, 71003, 0),
(24, 10, 71001, 0),
(25, 10, 71000, 0),
(26, 10, 71004, 0),
(27, 10, 71002, 1),
(28, 11, 3, 1),
(29, 11, 71003, 0),
(30, 11, 71001, 0),
(31, 11, 71000, 0),
(32, 11, 71004, 0),
(33, 11, 71002, 1),
(34, 12, 3, 1),
(35, 12, 71003, 0),
(36, 12, 71001, 0),
(37, 12, 71000, 0),
(38, 12, 71004, 0),
(39, 12, 71002, 0),
(40, 13, 3, 0),
(41, 13, 71003, 0),
(42, 13, 71001, 0),
(43, 13, 71000, 0),
(44, 13, 71004, 0),
(45, 13, 71002, 1),
(46, 14, 71004, 0),
(47, 14, 71002, 1),
(48, 15, 71004, 0),
(49, 15, 71002, 0),
(50, 16, 71001, 0),
(51, 16, 71000, 0),
(52, 16, 71004, 0),
(59, 18, 71003, 0),
(60, 18, 71001, 0),
(61, 18, 71000, 0),
(62, 18, 71004, 0),
(64, 19, 73148, 0),
(65, 20, 73148, 0),
(66, 21, 3, 0),
(67, 22, 3, 0);

-- --------------------------------------------------------

--
-- Table structure for table `polls`
--

CREATE TABLE `polls` (
  `id` int(11) NOT NULL,
  `open_time` datetime DEFAULT NULL,
  `close_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `polls`
--

INSERT INTO `polls` (`id`, `open_time`, `close_time`) VALUES
(7, '2025-07-08 18:30:00', '2025-07-13 20:20:00'),
(8, '2025-07-11 18:22:00', '2025-07-11 18:52:00'),
(9, '2025-07-09 17:03:00', '2025-07-09 18:53:00'),
(10, '2025-07-11 23:36:00', '2025-07-14 01:16:00'),
(11, '2025-07-12 11:22:00', '2025-07-12 13:12:00'),
(12, '2025-07-12 11:37:00', '2025-07-12 13:27:00'),
(13, '2025-07-12 17:23:00', '2025-07-12 20:51:00'),
(14, '2025-07-12 17:40:00', '2025-07-12 19:03:00');

-- --------------------------------------------------------

--
-- Table structure for table `poll_options`
--

CREATE TABLE `poll_options` (
  `id` int(11) NOT NULL,
  `poll_id` int(11) DEFAULT NULL,
  `question_id` int(11) DEFAULT NULL,
  `option_text` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `poll_options`
--

INSERT INTO `poll_options` (`id`, `poll_id`, `question_id`, `option_text`) VALUES
(106, 8, 32, '1'),
(107, 8, 32, '2'),
(108, 8, 32, '3'),
(109, 8, 32, '4'),
(110, 8, 32, '99'),
(111, 8, 32, '100'),
(112, 8, 33, 'aa'),
(113, 8, 33, 'bb'),
(114, 8, 33, 'cc'),
(115, 8, 33, 'dd'),
(118, 9, 35, 'q'),
(119, 9, 35, 'pq'),
(128, 7, 38, 'a'),
(129, 7, 38, 'b'),
(130, 7, 38, 'c'),
(131, 7, 38, 'de'),
(136, 11, 41, 'a11'),
(137, 11, 41, 'a12'),
(138, 12, 42, 'as'),
(139, 12, 42, 'ass'),
(140, 13, 43, 'sad'),
(141, 13, 43, 'asf'),
(148, 14, 47, 'cd1'),
(149, 14, 47, 'ef1'),
(154, 10, 50, 'a'),
(155, 10, 50, 'b');

-- --------------------------------------------------------

--
-- Table structure for table `poll_questions`
--

CREATE TABLE `poll_questions` (
  `id` int(11) NOT NULL,
  `poll_id` int(11) DEFAULT NULL,
  `question` text DEFAULT NULL,
  `select_type` enum('single','multi') DEFAULT 'single'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `poll_questions`
--

INSERT INTO `poll_questions` (`id`, `poll_id`, `question`, `select_type`) VALUES
(32, 8, 'bb', 'multi'),
(33, 8, '2', 'single'),
(35, 9, 'A', 'single'),
(38, 7, '1', 'single'),
(41, 11, 'a1', 'single'),
(42, 12, 'aa', 'single'),
(43, 13, 'AB2q', 'single'),
(47, 14, 'ab11111', 'single'),
(50, 10, '1136', 'single');

-- --------------------------------------------------------

--
-- Table structure for table `poll_roles`
--

CREATE TABLE `poll_roles` (
  `poll_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `poll_roles`
--

INSERT INTO `poll_roles` (`poll_id`, `role_id`) VALUES
(7, 1),
(7, 2),
(7, 3),
(7, 4),
(7, 5),
(7, 6),
(7, 7),
(7, 8),
(7, 9),
(8, 1),
(8, 2),
(8, 3),
(8, 4),
(8, 5),
(8, 6),
(8, 7),
(8, 8),
(8, 9),
(9, 1),
(9, 2),
(9, 3),
(9, 4),
(9, 5),
(9, 6),
(9, 7),
(9, 8),
(9, 9),
(10, 9),
(11, 1),
(11, 2),
(11, 3),
(11, 4),
(11, 5),
(11, 6),
(11, 7),
(11, 8),
(11, 9),
(12, 1),
(12, 2),
(12, 3),
(12, 4),
(12, 5),
(12, 6),
(12, 7),
(12, 8),
(12, 9),
(13, 1),
(13, 2),
(13, 3),
(13, 4),
(13, 5),
(13, 6),
(13, 7),
(13, 8),
(13, 9),
(14, 1),
(14, 2),
(14, 3),
(14, 4),
(14, 5),
(14, 6),
(14, 7),
(14, 8),
(14, 9);

-- --------------------------------------------------------

--
-- Table structure for table `poll_votes`
--

CREATE TABLE `poll_votes` (
  `id` int(11) NOT NULL,
  `poll_id` int(11) DEFAULT NULL,
  `option_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `poll_votes`
--

INSERT INTO `poll_votes` (`id`, `poll_id`, `option_id`, `user_id`) VALUES
(25, 8, 108, 3),
(26, 8, 110, 3),
(27, 8, 113, 3),
(28, 8, 106, 71002),
(29, 8, 112, 71002),
(30, 13, 141, 3),
(31, 7, 131, 71002),
(32, 7, 131, 3);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`) VALUES
(8, 'Executive Member'),
(5, 'General Secretary'),
(6, 'Joint Secretary'),
(9, 'Member'),
(3, 'President'),
(2, 'RO'),
(1, 'Super Admin'),
(7, 'Treasurer'),
(4, 'Vice President');

-- --------------------------------------------------------

--
-- Table structure for table `role_changes`
--

CREATE TABLE `role_changes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `old_role_id` int(11) NOT NULL,
  `new_role_id` int(11) NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `topics`
--

CREATE TABLE `topics` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_public` tinyint(1) DEFAULT 0,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `topics`
--

INSERT INTO `topics` (`id`, `title`, `description`, `created_at`, `is_public`, `user_id`) VALUES
(1, 'Lease Policy', 'Documents related to company lease or rental policies', '2025-06-29 11:46:08', 1, 1),
(2, 'Medical IPD', 'Insurance and inpatient medical coverage policies', '2025-06-29 11:46:08', 1, 1),
(3, 'Canteen Facility', 'Rules, schedules, and other documents related to canteen services', '2025-06-29 11:46:08', 1, 1),
(4, 'GYM Facility', 'Information about gym access, timing, and related facilities', '2025-06-29 11:46:08', 1, 1),
(5, 'Parking Facility', 'Facilities at RO/BO', '2025-06-29 12:17:12', 1, 1),
(6, 'food policy', 'Breakfast in the morning', '2025-07-03 14:14:43', 0, 71001),
(7, 'coupon policy', 'amazon coupons may given on diwali', '2025-07-03 14:15:41', 1, 71001),
(8, 'Change the FMCD Policy', 'It is really important', '2025-07-04 09:13:36', 1, 3),
(9, 'Change Payment policy', 'this should be happen in next 3 months', '2025-07-04 09:14:04', 1, 3),
(10, 'Training Policy', 'Train', '2025-07-04 09:15:22', 0, 3),
(12, 'Training Policy for heads', 'Sending to IIM s', '2025-07-04 09:41:52', 0, 3),
(14, 'new topic', 'this is about trip in europe', '2025-07-06 16:49:10', 1, 3),
(15, 'abcz', 'asdfas', '2025-07-06 19:31:46', 1, 3),
(16, 'xyz2a', 'xyzdesc2', '2025-07-07 09:56:36', 1, 3),
(18, 'asldm', 'asdfmll', '2025-07-12 17:20:00', 1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `topic_documents`
--

CREATE TABLE `topic_documents` (
  `id` int(11) NOT NULL,
  `topic_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `filepath` text DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `topic_documents`
--

INSERT INTO `topic_documents` (`id`, `topic_id`, `user_id`, `title`, `remarks`, `filename`, `filepath`, `uploaded_at`) VALUES
(6, 5, 3, 'abc', 'lkafjlks', 'Options_final.pdf', 'uploads\\topic-docs\\Options_final.pdf', '2025-07-03 13:46:24'),
(7, 2, 3, 'afsndjk', 'saldkfldksa', 'ROD_Maintenance.pdf', 'uploads\\topic-docs\\ROD_Maintenance.pdf', '2025-07-03 13:47:29'),
(8, 5, 3, 'fkl', 'lkmsflmlasd', 'saved_tentative.pdf', 'uploads\\topic-docs\\saved_tentative.pdf', '2025-07-03 13:47:39'),
(9, 6, 3, 'asd', 'asdl', 'SuccessReceipt (1).pdf', 'uploads\\topic-docs\\SuccessReceipt (1).pdf', '2025-07-03 15:00:38');

-- --------------------------------------------------------

--
-- Table structure for table `topic_proposals`
--

CREATE TABLE `topic_proposals` (
  `id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `moderator_id` int(11) DEFAULT NULL,
  `moderator_remarks` text DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `topic_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `topic_proposals`
--

INSERT INTO `topic_proposals` (`id`, `requested_by`, `title`, `description`, `is_public`, `status`, `moderator_id`, `moderator_remarks`, `decided_at`, `created_at`, `topic_id`) VALUES
(1, 71000, 'food policy', 'Breakfast in the morning', 1, 'APPROVED', 3, 'The same has decided and agreed to take up with the higher management', '2025-07-03 19:44:43', '2025-07-03 19:43:58', NULL),
(2, 71000, 'coupon policy', 'amazon coupons may given on diwali', 1, 'APPROVED', 3, 'Not agreed in the EC meeting.', '2025-07-03 19:45:41', '2025-07-03 19:45:25', NULL),
(3, 71000, 'what about vehicle policy', '', 1, 'REJECTED', 3, 'not approved', '2025-07-03 19:47:23', '2025-07-03 19:46:22', NULL),
(4, 71002, 'can you see my proposal of transfer', 'asfjdaskfn', 1, 'REJECTED', 3, 'Not for individual', '2025-07-04 15:42:23', '2025-07-04 15:41:22', NULL),
(5, 3, 'Can you see my proposal of topic', 'asdfkja', 1, 'REJECTED', 3, 'not approved', '2025-07-04 15:42:33', '2025-07-04 15:41:45', NULL),
(6, 71002, 'can you see my proposal of transfer again', 'jsakdfl', 1, 'APPROVED', 3, 'ok', '2025-07-04 15:43:10', '2025-07-04 15:43:01', NULL),
(7, 3, 'abc', 'abcd', 1, 'APPROVED', 3, 'convinced', '2025-07-04 15:51:49', '2025-07-04 15:51:13', NULL),
(8, 3, 'cde', 'efg', 1, 'REJECTED', 3, 'not convinced', '2025-07-04 15:51:42', '2025-07-04 15:51:26', NULL),
(9, 3, 'xyz', 'jakfdnklasmfl', 1, 'APPROVED', 3, 'ok', '2025-07-04 15:53:39', '2025-07-04 15:53:26', NULL),
(10, 3, 'xyz2a', 'xyzdesc2', 1, 'APPROVED', 3, '', '2025-07-07 15:26:36', '2025-07-04 15:54:42', 16),
(11, 71002, 'this is new proposal', 'askjdnkj', 1, 'APPROVED', 3, 'aproved in the meeting', '2025-07-05 16:12:54', '2025-07-05 16:12:19', NULL),
(12, 3, 'please takeup my transfer', 'as i am going to marry', 1, 'REJECTED', 3, 'Not for individual request', '2025-07-06 22:22:18', '2025-07-06 22:20:46', NULL),
(13, 3, 'abcz', 'asdfas', 1, 'APPROVED', 3, '', '2025-07-07 01:01:46', '2025-07-06 22:50:09', 15),
(14, 3, 'concerning', 'ajsdknasdknk', 1, 'REJECTED', 3, 'Not for individual request', '2025-07-07 15:15:50', '2025-07-07 15:15:25', NULL),
(15, 3, 'asdfkjn', 'skajdfas', 1, 'PENDING', NULL, NULL, NULL, '2025-07-07 15:32:28', NULL),
(16, 3, 'dssad', 'lasdf', 1, 'REJECTED', 3, '', '2025-07-12 22:50:02', '2025-07-12 22:49:19', NULL),
(17, 3, 'asldm', 'asdfmll', 1, 'APPROVED', 3, '', '2025-07-12 22:50:00', '2025-07-12 22:49:35', 18);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `password_hash` char(60) NOT NULL,
  `must_change_password` tinyint(1) DEFAULT 0,
  `role_id` int(11) DEFAULT 2,
  `reset_otp` varchar(10) DEFAULT NULL,
  `reset_otp_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `photo`, `password_hash`, `must_change_password`, `role_id`, `reset_otp`, `reset_otp_expires`) VALUES
(3, 'SUPER_ADMIN', 'admin565@yopmail.com', '/uploads/avatars/u3.png', '$2b$10$/PNGj/mJHKSAqQnP1F/GmO1t4OpyO81EpwljrnbLmufVAjFPqm9Du', 0, 1, NULL, NULL),
(71000, 'askjfdna', '71000@yopmail.com', NULL, '$2b$10$zHGPWhoc7eo5yTTMfHFenu2gs7gXpugz2bayl5vL5.mGznI2GFKku', 0, 3, NULL, NULL),
(71001, 'AVINASH m d', '71001@yopmail.com', NULL, '$2b$10$zHGPWhoc7eo5yTTMfHFenu2gs7gXpugz2bayl5vL5.mGznI2GFKku', 0, 5, NULL, NULL),
(71002, 'PARTH', '71002@yopmail.com', NULL, '$2b$10$zHGPWhoc7eo5yTTMfHFenu2gs7gXpugz2bayl5vL5.mGznI2GFKku', 0, 8, '260899', '2025-07-05 22:43:43'),
(71003, 'nitish Kum', '71003@yopmail.com', NULL, '$2b$10$zHGPWhoc7eo5yTTMfHFenu2gs7gXpugz2bayl5vL5.mGznI2GFKku', 0, 3, NULL, NULL),
(71004, 'Avku', '71004@yopmail.com', NULL, '$2b$10$zHGPWhoc7eo5yTTMfHFenu2gs7gXpugz2bayl5vL5.mGznI2GFKku', 0, 9, NULL, NULL),
(71009, 'Prabha', 'csesuryaprabha@gmail.com', NULL, '$2b$10$ifKMSirbIHGqWZg6vJjAy.Oy6vyZ2grA0Wre62B1n/9xFkGgatH9W', 1, 7, NULL, NULL),
(73148, 'PArth', 'parthkandwal@gmail.com', NULL, '$2b$10$f36rpVxijPz6c39Kffc.aeDLLzqYfbAdO3hw9d2dspo3GKS6KV3F2', 0, 9, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `activity_roles`
--
ALTER TABLE `activity_roles`
  ADD PRIMARY KEY (`activity_id`,`role_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `performed_by` (`performed_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_docs_category` (`category_id`),
  ADD KEY `fk_docs_user` (`user_id`);

--
-- Indexes for table `notification_jobs`
--
ALTER TABLE `notification_jobs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification_recipients`
--
ALTER TABLE `notification_recipients`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `polls`
--
ALTER TABLE `polls`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `poll_options`
--
ALTER TABLE `poll_options`
  ADD PRIMARY KEY (`id`),
  ADD KEY `poll_id` (`poll_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `poll_questions`
--
ALTER TABLE `poll_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `poll_id` (`poll_id`);

--
-- Indexes for table `poll_roles`
--
ALTER TABLE `poll_roles`
  ADD PRIMARY KEY (`poll_id`,`role_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `poll_votes`
--
ALTER TABLE `poll_votes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `poll_id` (`poll_id`),
  ADD KEY `option_id` (`option_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `role_changes`
--
ALTER TABLE `role_changes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `topic_documents`
--
ALTER TABLE `topic_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `topic_id` (`topic_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `topic_proposals`
--
ALTER TABLE `topic_proposals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `moderator_id` (`moderator_id`),
  ADD KEY `topic_id` (`topic_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_user_role` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=262;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `notification_jobs`
--
ALTER TABLE `notification_jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `notification_recipients`
--
ALTER TABLE `notification_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `polls`
--
ALTER TABLE `polls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `poll_options`
--
ALTER TABLE `poll_options`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=156;

--
-- AUTO_INCREMENT for table `poll_questions`
--
ALTER TABLE `poll_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `poll_votes`
--
ALTER TABLE `poll_votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

--
-- AUTO_INCREMENT for table `role_changes`
--
ALTER TABLE `role_changes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `topics`
--
ALTER TABLE `topics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `topic_documents`
--
ALTER TABLE `topic_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `topic_proposals`
--
ALTER TABLE `topic_proposals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71713002;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_roles`
--
ALTER TABLE `activity_roles`
  ADD CONSTRAINT `activity_roles_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`),
  ADD CONSTRAINT `activity_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_docs_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_docs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `poll_options`
--
ALTER TABLE `poll_options`
  ADD CONSTRAINT `poll_options_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `poll_options_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `poll_questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `poll_questions`
--
ALTER TABLE `poll_questions`
  ADD CONSTRAINT `poll_questions_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `poll_roles`
--
ALTER TABLE `poll_roles`
  ADD CONSTRAINT `poll_roles_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `poll_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `poll_votes`
--
ALTER TABLE `poll_votes`
  ADD CONSTRAINT `poll_votes_ibfk_1` FOREIGN KEY (`poll_id`) REFERENCES `polls` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `poll_votes_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `poll_options` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `poll_votes_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `topic_documents`
--
ALTER TABLE `topic_documents`
  ADD CONSTRAINT `topic_documents_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`),
  ADD CONSTRAINT `topic_documents_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `topic_proposals`
--
ALTER TABLE `topic_proposals`
  ADD CONSTRAINT `topic_proposals_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `topic_proposals_ibfk_2` FOREIGN KEY (`moderator_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
