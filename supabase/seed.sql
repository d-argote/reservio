SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict iWOLGlmCDqnVlyOahgjCHWL5ayGEhaEPCpzsbKgcaV684TW6dJjzjbYD9PUHAxn

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") VALUES
	('4c99b764-b4e5-4a7a-99b8-ef757fe2d176', 'e6266e4a-ff74-41ce-a714-f88a7284e979', '39235a6d-effc-465e-b621-f8b2ca19d9c5', 's256', 'PdWsH7HIGEzobM9-ZkPX8yfueqaGdOHOdkjrYCPeiiQ', 'email', '', '', '2026-04-20 22:02:19.125973+00', '2026-04-20 22:02:38.140949+00', 'email/signup', '2026-04-20 22:02:38.140895+00', NULL, NULL, NULL, NULL, false),
	('9bb51c82-8da2-4d5f-9676-09b2b115698f', '19a756e2-d10d-4b5c-a8d0-830e444ffa21', '5353bec7-58ae-4278-9569-6dfacbdd8937', 's256', 'CEEbyz7x-PT-nV2S-tqvIbxVsNEwm_3TcOoP8Momrjo', 'recovery', '', '', '2026-04-24 07:28:04.908436+00', '2026-04-24 07:28:13.688037+00', 'recovery', '2026-04-24 07:28:13.687987+00', NULL, NULL, NULL, NULL, false),
	('d6714854-3fec-4ca0-89ef-ec05056136d5', '771d7e06-7d22-4fd4-ae97-81302251d730', 'fe831a9b-d316-4388-a1b0-0680377b79dd', 's256', 'Uh7rhgXon91G2K0n5WVgVDCyMOB7kqHwR81v-ABT6LY', 'email', '', '', '2026-04-21 00:04:06.12025+00', '2026-04-21 00:32:26.022617+00', 'email/signup', '2026-04-21 00:32:26.022554+00', NULL, NULL, NULL, NULL, false),
	('4f4e165f-3f29-409f-9a59-9db8bdf21d90', '036e75ec-be99-47de-a5c8-62c00c1c5f04', 'e384c6ce-9a5a-4169-9fb4-a3ac795a9ec9', 's256', 'ycPLikXKseAr7NS5HCZL_hMLH0UzPfASaTxuLu3HciI', 'email', '', '', '2026-04-21 00:27:42.673738+00', '2026-04-21 00:33:15.132938+00', 'email/signup', '2026-04-21 00:33:15.132885+00', NULL, NULL, NULL, NULL, false),
	('e4fc0da3-9c8e-4a52-be48-11a7f01623d7', '19a756e2-d10d-4b5c-a8d0-830e444ffa21', '14d21a04-fcc7-48be-a970-47904aac899a', 's256', 'LdycXmpJzFX2YHNl9TZj8Az9KCZyNw-qgBuHqf9OqEs', 'recovery', '', '', '2026-04-24 07:32:02.370431+00', '2026-04-24 07:32:16.797222+00', 'recovery', '2026-04-24 07:32:16.797153+00', NULL, NULL, NULL, NULL, false),
	('01f59c24-8fa9-497c-a0be-928b4be55936', 'aa0a6087-dff9-42aa-a77e-5761c3b4a422', 'd1c998c4-0cc5-4751-a27f-7e0db0aba35a', 's256', 'AWLTt_MUdlldjmkeV7U_-IwaKYahvHuDzqHnOCo5k6Q', 'email', '', '', '2026-04-23 22:45:34.352261+00', '2026-04-23 22:45:59.646386+00', 'email/signup', '2026-04-23 22:45:59.646333+00', NULL, NULL, NULL, NULL, false),
	('bf774ae5-787f-475d-9199-0704b9245441', 'eebe0e4b-e7b3-4c07-b767-1b4ddc4a57a7', '877a243b-eb48-4be5-81fa-d217e0d0794b', 's256', '3aXZ2pq-pCdi_iSGOd5NAhatP7q7y2VzIqO8t1UgbWo', 'email', '', '', '2026-04-23 22:50:28.294554+00', '2026-04-23 22:50:49.855678+00', 'email/signup', '2026-04-23 22:50:49.855606+00', NULL, NULL, NULL, NULL, false),
	('271d0a98-36e1-462b-a7df-a8f254edefd8', 'eebe0e4b-e7b3-4c07-b767-1b4ddc4a57a7', '17f9d0a6-a7d5-4ac1-aea1-74448d5e4a2a', 's256', 'BruFggYSkuG391miDUW0D6BYRd-DostVK4sUO2QeJM8', 'recovery', '', '', '2026-04-23 23:02:54.963565+00', '2026-04-23 23:02:54.963565+00', 'recovery', NULL, NULL, NULL, NULL, NULL, false),
	('58262bff-e20d-412e-a8b4-6db6e1125299', 'eebe0e4b-e7b3-4c07-b767-1b4ddc4a57a7', 'bd3d340b-200b-4da3-adcb-f1dbbe40118b', 's256', 'Ny__Ps6d7Rb1pgFdi7rTUES2GPeLT0uYq2zMU2R0BaY', 'recovery', '', '', '2026-04-23 23:05:56.740465+00', '2026-04-23 23:06:08.760677+00', 'recovery', '2026-04-23 23:06:08.760621+00', NULL, NULL, NULL, NULL, false),
	('f478138b-d318-4ba8-b97c-e2dffc85e951', '996261f9-e2e6-424f-90b6-0ea197e23167', '19c95509-20e5-4acc-82c5-178229e834ac', 's256', 'E5E2udTWMNWv5UOtkW5Vd06pLcpT-d5S0hME2DYtZoY', 'email', '', '', '2026-04-24 07:32:55.962822+00', '2026-04-24 07:33:07.896774+00', 'email/signup', '2026-04-24 07:33:07.896726+00', NULL, NULL, NULL, NULL, false),
	('a32affb5-d415-4922-a10c-e3a3e95d63fa', 'fc0ba7b5-58f3-4d9b-9ffb-0c42efdb1451', '0fa8356c-08d2-4eeb-845c-028a7ea94012', 's256', 'F2yA3f66k4CJj2AawsADopADnhcbqQy8pNhcKuQu48M', 'email', '', '', '2026-04-24 03:55:40.656061+00', '2026-04-24 03:55:53.522588+00', 'email/signup', '2026-04-24 03:55:53.522538+00', NULL, NULL, NULL, NULL, false),
	('283bec82-2d39-45e6-a8d9-6aaa1205d7a0', '19a756e2-d10d-4b5c-a8d0-830e444ffa21', '0d096d71-1722-44b6-8db0-b4f4ac05c1b1', 's256', 'kb7FHOqtW9Y6oH0HE7BqL0JBOIkBCQK0KBObczO8BN4', 'recovery', '', '', '2026-04-24 07:33:51.018964+00', '2026-04-24 07:33:51.018964+00', 'recovery', NULL, NULL, NULL, NULL, NULL, false),
	('08c2c98a-d677-40c0-9885-6852c665f34f', '2292aa65-fa42-4840-99da-d1d36acefe50', '13c07001-e6a3-4166-9d78-07c082428153', 's256', '96TXyGbjePrTJdG8ZYdEpsJulcctq7BaZQPdpiqwT44', 'email', '', '', '2026-04-24 04:48:44.373129+00', '2026-04-24 04:48:57.952301+00', 'email/signup', '2026-04-24 04:48:57.952247+00', NULL, NULL, NULL, NULL, false),
	('08291976-e90e-47cb-a546-0f38125f77ac', 'f9eb8bde-c301-4ccf-bb5d-05ee616f7215', '3bb9228d-93ab-48d5-b7a1-7f2dda159aaa', 's256', 'gg-YoE7cKa-Iy_uaGgVppoBNmfk3H4QI6G0HYdj1l9E', 'email', '', '', '2026-04-24 07:02:07.497281+00', '2026-04-24 07:02:07.497281+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('08c59c5e-5025-42ba-b87b-2621df9a1492', '19a756e2-d10d-4b5c-a8d0-830e444ffa21', 'f2558960-b5e8-4598-a75a-a81e519c8bc4', 's256', 'B96IHxEM_10ToV77a5g6o3zIEmmknk1QrJf8nQUUzaE', 'email', '', '', '2026-04-24 07:25:52.996235+00', '2026-04-24 07:26:17.035564+00', 'email/signup', '2026-04-24 07:26:17.035511+00', NULL, NULL, NULL, NULL, false),
	('f02076ab-b593-4717-9b5b-983d10ba0804', '996261f9-e2e6-424f-90b6-0ea197e23167', '8c8c15ac-e829-4218-8f2a-5eda6fd0b984', 's256', 'QRahznznwp7KTHR4296MmjXzljlAFJhb_CZd0Ewe7jM', 'recovery', '', '', '2026-04-24 07:33:57.378216+00', '2026-04-24 07:34:11.597612+00', 'recovery', '2026-04-24 07:34:11.597563+00', NULL, NULL, NULL, NULL, false),
	('a7ae8d12-d969-42d5-b9c6-bb7ef30c80f1', 'c4425793-f466-4c5a-8bc4-3cfff879c835', '5ac6c749-f87c-4be2-aa37-0fb7c87ca439', 's256', 'VkJYAmBbSeLj9OjNQiZC2ESvf5dhvudJMfMSZKaoyvg', 'email', '', '', '2026-04-24 07:35:41.605404+00', '2026-04-24 07:35:41.605404+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('eb3e6d46-4262-43d8-985d-4d7a863a3edc', '63c18240-1225-49ac-ba0e-4b7af5ae5fcb', 'b8787c17-8b43-4648-a5c6-bff014bbcb87', 's256', 'Kvqny0yWCshRWN-PnZrOQYDVF2yuYxB9J-YCbhNwJpw', 'email', '', '', '2026-04-24 07:41:26.851432+00', '2026-04-24 07:41:26.851432+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('a87206f5-3157-44d3-83e2-d752fa99d506', '7e23293a-a5db-4ae0-86bb-b168086ddf13', 'd3bb637d-646b-4cb4-bfb5-80b16992d4da', 's256', 'YWzFwQ8sFltHgpPWbAmpueLumE_CuCgrDT7lvGrXwLY', 'email', '', '', '2026-04-24 07:51:04.190047+00', '2026-04-24 07:51:21.72335+00', 'email/signup', '2026-04-24 07:51:21.723282+00', NULL, NULL, NULL, NULL, false),
	('5edfa173-6761-4c15-a7f2-4e69f027b7fd', 'd0feb116-b59a-4a26-9f5b-149436b4ef85', '33529000-c52a-4b82-9c0a-40d975ec12c1', 's256', 'yIh5UI9JdcmHOxOohTALsBkx8XRqhssDfAQPVAyvtNk', 'email', '', '', '2026-04-24 07:52:42.69027+00', '2026-04-24 07:53:34.700938+00', 'email/signup', '2026-04-24 07:53:34.700862+00', NULL, NULL, NULL, NULL, false),
	('08e5a8eb-ccf5-41a1-a0a1-19f13e37d63a', '7d15d9d5-67fa-41b5-855c-bd62d42623a2', '4fc742c1-a2f4-444f-9fdd-9f4616ece36b', 's256', '-gPyClIGQufO-toMpggHExdAMDfZkO__yl3zrWq5LhA', 'email', '', '', '2026-04-24 14:28:14.047222+00', '2026-04-24 14:28:30.570271+00', 'email/signup', '2026-04-24 14:28:30.570215+00', NULL, NULL, NULL, NULL, false),
	('0461b562-2c84-4072-8dd8-c50a7cc7b208', '673fba26-c798-4233-be28-e6113d7d8270', 'f04f863c-6e29-441b-b061-c5d8cff95237', 's256', 'nHGd5KWodMFVoyygW3k-E-PTSeaPu1exKcd1GC79X1U', 'email', '', '', '2026-04-24 14:35:06.123448+00', '2026-04-24 14:35:17.419311+00', 'email/signup', '2026-04-24 14:35:17.419261+00', NULL, NULL, NULL, NULL, false),
	('18f2edd1-2768-433f-84d1-a68d4c8fd307', '7bbd217f-576b-45f4-86b8-2da24ed9d870', '8d5cc102-0fb5-4f88-8f80-363a29218f8d', 's256', 'JgmWfAaWR28AYK8RbgNRKkVro8TybEGvnN67tiC6gtk', 'email', '', '', '2026-04-24 18:43:42.306197+00', '2026-04-24 18:43:56.176635+00', 'email/signup', '2026-04-24 18:43:56.176575+00', NULL, NULL, NULL, NULL, false),
	('3faf17dc-b8c6-4cbb-b406-06633417dd51', '1fc6be64-9ddf-4870-b847-2c5f7a77b9f6', '8d8d59a5-d508-414c-8c79-0f24070ff025', 's256', '0UYrsK805puJAP1RCBXEBW979E2t0ZRr8RHR1099_eY', 'email', '', '', '2026-04-24 16:24:30.894482+00', '2026-04-24 16:24:30.894482+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('c339e73c-b77f-482f-8de3-70ca0de31cda', '14c0b1a0-a41d-4f46-b614-5d520be941fd', '966a4dfc-7f2b-4ecf-9587-4934eebe437e', 's256', '2T3eR9nW0YpY8YtR7zUh4pCYfluK2ZfLPCRqQNK5C-U', 'email', '', '', '2026-04-24 17:02:36.028351+00', '2026-04-24 17:02:51.563605+00', 'email/signup', '2026-04-24 17:02:51.563545+00', NULL, NULL, NULL, NULL, false),
	('443f6d9e-8541-4451-b77e-2376b6cdfc61', '7bbd217f-576b-45f4-86b8-2da24ed9d870', '2b7b9abe-74ae-493f-a491-a36de27e3b7c', 's256', 'eFVzO_0qI6oodl6AmSeuDETQN534JjOFVW8t1UUGyRQ', 'recovery', '', '', '2026-04-24 19:16:11.439529+00', '2026-04-24 19:16:25.576993+00', 'recovery', '2026-04-24 19:16:25.576936+00', NULL, NULL, NULL, NULL, false),
	('defdc080-7bf8-433d-8bbc-74d7a4468c01', 'e08013fa-37dc-402a-9cf5-716c8d2a3937', 'c89b811a-d297-4b97-9ec6-025c6db48699', 's256', '5Qu3-dv7Pu5FUwstejNPHQRbNYF4Ox3qJ9oYbr8ZzW0', 'email', '', '', '2026-04-24 19:30:27.93183+00', '2026-04-24 19:30:27.93183+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('d686b2fc-3dd2-46f0-896d-0fff510d35ad', '1fdb6f47-5494-40ad-b018-bca1890fa961', 'b1af4b90-e566-494f-abe9-8198667c7075', 's256', 'Eq9kPVYkp13OGba6VxLFDoW4kDXcnLMoCHYyWGmC-NE', 'email', '', '', '2026-04-24 19:43:23.552902+00', '2026-04-24 19:43:35.734141+00', 'email/signup', '2026-04-24 19:43:35.734056+00', NULL, NULL, NULL, NULL, false),
	('7bb75787-a46d-489a-b3c2-27d32ae04143', '1fdb6f47-5494-40ad-b018-bca1890fa961', '96233762-aa9b-44a6-a2e6-359b3a045a56', 's256', '44VghZjcRdWoCl_-6xXvNmCv2vH6N2QI0t4366KGAus', 'recovery', '', '', '2026-04-24 19:43:52.26677+00', '2026-04-24 19:44:01.986395+00', 'recovery', '2026-04-24 19:44:01.986292+00', NULL, NULL, NULL, NULL, false),
	('be35a573-04df-47ea-b770-42240218bde1', '1fdb6f47-5494-40ad-b018-bca1890fa961', '0090d36e-169a-452c-93c4-8cdfaf1a3cb9', 's256', 't0_Fbsv6qBz6JyESp3ahIZ0QnOsdFSdIlTZ5CkdyJyo', 'recovery', '', '', '2026-04-24 19:45:20.601638+00', '2026-04-24 19:45:28.739531+00', 'recovery', '2026-04-24 19:45:28.739472+00', NULL, NULL, NULL, NULL, false),
	('6b52ade2-1efd-4791-9ffc-17269ba95e6c', 'c4c97c4a-5d0b-4fbf-9fde-1eac7a779816', 'af2900eb-f37e-4822-a53a-b01fd3b268be', 's256', 'Vy7qbNnIyJPo50ag2WmcoymuA2fv6LfD1BBRqM4Prfc', 'email', '', '', '2026-04-24 19:45:54.285581+00', '2026-04-24 19:46:10.073669+00', 'email/signup', '2026-04-24 19:46:10.073618+00', NULL, NULL, NULL, NULL, false),
	('f7823fc0-d49a-4264-abf3-8246124891aa', 'c4c97c4a-5d0b-4fbf-9fde-1eac7a779816', '4e3bad35-c24a-4595-bad1-0180a689a534', 's256', 't7JIurLeP5-KXIYFjEc6b2Qj7jnPG76a9LodjdMWLBo', 'recovery', '', '', '2026-04-24 19:46:26.70838+00', '2026-04-24 19:46:36.035195+00', 'recovery', '2026-04-24 19:46:36.035135+00', NULL, NULL, NULL, NULL, false),
	('72af1619-8344-42a7-93e1-8700dc5548c5', '93724602-ade8-423d-9f0c-708ef59ced24', '5caa743d-ed3d-4adc-8ce2-e2d79403e1f8', 's256', 'Pj8Twb0EWBtlXsJ38-T3ha4D-HDmcPYL30iNMy_y12E', 'email', '', '', '2026-04-24 21:20:34.611751+00', '2026-04-24 21:21:21.270821+00', 'email/signup', '2026-04-24 21:21:21.270761+00', NULL, NULL, NULL, NULL, false),
	('7ba6ed77-e7a3-40b1-959e-8dd97051da2b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7d1b74ba-f3bb-4f44-b967-b3e2537c35a9', 's256', 'NQj_-8-XIX42mc2_50M-VKqFrk3kl0ph5_5XSeQQQC8', 'email', '', '', '2026-04-25 00:00:52.941426+00', '2026-04-25 00:02:35.51856+00', 'email/signup', '2026-04-25 00:02:35.518503+00', NULL, NULL, NULL, NULL, false),
	('5a06df68-15c5-4aeb-9277-7d4ceb0d88ec', 'b3b2f2fa-2772-422f-92b3-8b0bf10664ac', 'c8c8fb69-c462-4d04-8f2a-961ee072e964', 's256', 'Pj-L16EG7N0lu-ZJV48F7zn4d1NcxBxUqvFqNYg8WE0', 'email', '', '', '2026-04-25 00:00:03.219746+00', '2026-04-25 00:00:03.219746+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('42e3b7ea-437a-4b2a-b58f-adb2e0bafb23', '6a5f5dd9-c245-43d9-9ad4-57c2887506aa', '1b670d09-4274-4b0d-a3cc-94f3dddbcf13', 's256', 'FtyD3RIwu3fFNgaRD7GESedzxIgsBdRha9nOxf8foPY', 'email', '', '', '2026-04-25 00:07:10.176865+00', '2026-04-25 00:07:32.231844+00', 'email/signup', '2026-04-25 00:07:32.231794+00', NULL, NULL, NULL, NULL, false),
	('df6ebac1-8ecb-4b2d-9d1f-0bf5029ec4b4', '3cdf23c0-cc47-4554-ac75-605d91f1b10a', 'deaa1011-135f-432b-9815-72cb46615dac', 's256', 'cLxlQfo0NByh-a4V_oX_dE82OEIXjXF-h_pcuIcVpOo', 'email', '', '', '2026-05-25 19:57:23.913878+00', '2026-05-25 19:57:45.043528+00', 'email/signup', '2026-05-25 19:57:45.04345+00', NULL, NULL, NULL, NULL, false),
	('02c7adc6-8ab0-40e5-94c8-26b854ea0b0c', '64d3e06d-9d76-4edb-b2f1-eebb9daaf783', '9e28d4e1-755f-4076-90d3-69346c25c5c7', 's256', 'IX0qxltPea_3OeqS8mYoIYAysxhx3PfcnbUrvGc5Vso', 'email', '', '', '2026-05-04 22:33:47.156455+00', '2026-05-04 22:34:11.565741+00', 'email/signup', '2026-05-04 22:34:11.565689+00', NULL, NULL, NULL, NULL, false),
	('1ae89ae3-6c84-470c-93c7-ed87008b8b7d', '6a5f5dd9-c245-43d9-9ad4-57c2887506aa', '9885aee5-3fcb-4df8-8e5d-16a61583a3d7', 's256', 'PMxQTSQIs2_86Jqt7FGlHHc2XIVF4eN7ZGW214h-G2A', 'recovery', '', '', '2026-05-09 14:20:32.389847+00', '2026-05-09 14:20:32.389847+00', 'recovery', NULL, NULL, NULL, NULL, NULL, false),
	('b10174d3-ae39-463b-93a6-6977cdcfd9c6', '0bc2c1f9-71bf-4394-bff7-cb4ff62c442a', 'f937ee4d-bd35-4730-bd3b-588487c26ade', 's256', 'qtkOLVN7Uan7dLj3lXhf4KI17Kg1AlFKfgok4dBHIJQ', 'email', '', '', '2026-05-09 19:52:41.248415+00', '2026-05-09 19:52:41.248415+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false),
	('3543e1e4-3d7d-49b6-9aa3-2e9fffcae89c', '5fb9fc31-7de4-43b6-9ee0-35408f65e87c', 'bb48cc92-07ec-4bd1-95a6-4caf1edde69d', 's256', 'M6-12gnCCGg63UrhsLt4rCUejli1Mbn-jrQPZcaJ25c', 'email', '', '', '2026-05-09 19:53:51.788652+00', '2026-05-09 19:54:04.75323+00', 'email/signup', '2026-05-09 19:54:04.753177+00', NULL, NULL, NULL, NULL, false),
	('70ff0a3d-bf25-4782-a2b8-4899bd9b93c8', '8cc6d1bb-7766-42af-a5a2-ce2448d1fd12', '5c9b9d58-3a3e-4405-83e4-64c02f4905fd', 's256', 'WWMlTBsOubdOO1eoZE5EMGg61z54sSZWtc2V22V7xgI', 'email', '', '', '2026-05-16 00:44:55.53138+00', '2026-05-16 00:45:27.775238+00', 'email/signup', '2026-05-16 00:45:27.775184+00', NULL, NULL, NULL, NULL, false),
	('5ecf3673-6e65-4b47-911f-3585e7ccb6f5', '287597e7-876e-488c-8353-8ebd23ebd84c', '65098857-d594-4dc7-9dd8-a264d7341daf', 's256', 'job9D3JBsMvzpwf41QRi71XkpOayqkB3gQSCSEoO6Xs', 'email', '', '', '2026-05-22 04:14:58.778748+00', '2026-05-22 04:15:41.236593+00', 'email/signup', '2026-05-22 04:15:41.236536+00', NULL, NULL, NULL, NULL, false),
	('bb4a3f8c-502e-46b6-9c5f-aa6de42d04aa', 'fabeac19-6752-4da6-b1f5-bb4b3115f529', '548bb6ca-28d0-4227-a3ad-7768aa44692a', 's256', 'ICNM4S2EebEIch5QZeQ32OpU2SXQ2WynThbHkZ9DZFo', 'email', '', '', '2026-05-23 01:27:25.756396+00', '2026-05-23 01:27:49.437975+00', 'email/signup', '2026-05-23 01:27:49.437924+00', NULL, NULL, NULL, NULL, false);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '3cdf23c0-cc47-4554-ac75-605d91f1b10a', 'authenticated', 'authenticated', 'diego.argote.0ds@utap.edu.co', '$2a$10$sctyCIYLUPw3jtSdxCNUFex1EeTwmOgaJh.JRFOdwOkErYwVQKE3e', '2026-05-25 19:57:45.023871+00', NULL, '', '2026-05-25 19:57:23.926951+00', '', NULL, '', '', NULL, '2026-05-25 19:57:52.347503+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "3cdf23c0-cc47-4554-ac75-605d91f1b10a", "email": "diego.argote.0ds@utap.edu.co", "nombre": "Diego Argote", "email_verified": true, "phone_verified": false}', NULL, '2026-05-25 19:57:23.87998+00', '2026-05-25 19:57:52.372439+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', 'authenticated', 'authenticated', 'diegoargotepabon@gmail.com', '$2a$10$jQhz0t1k0lYmF1CAJWIyJ.xDdEqsRo9HR8xKLHY1A0NhQS1dY.osC', '2026-04-25 00:02:35.501041+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-26 16:27:54.58798+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "d59e97f3-278b-4ff5-98a1-fdf0f703f974", "email": "diegoargotepabon@gmail.com", "nombre": "Pablo Perez", "email_verified": true, "phone_verified": false}', NULL, '2026-04-25 00:00:52.910148+00', '2026-05-26 16:27:54.632744+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('d59e97f3-278b-4ff5-98a1-fdf0f703f974', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{"sub": "d59e97f3-278b-4ff5-98a1-fdf0f703f974", "email": "diegoargotepabon@gmail.com", "nombre": "Pablo Perez", "email_verified": true, "phone_verified": false}', 'email', '2026-04-25 00:00:52.93746+00', '2026-04-25 00:00:52.937512+00', '2026-04-25 00:00:52.937512+00', '8896bc66-b82c-45eb-b364-6a10504d049a'),
	('3cdf23c0-cc47-4554-ac75-605d91f1b10a', '3cdf23c0-cc47-4554-ac75-605d91f1b10a', '{"sub": "3cdf23c0-cc47-4554-ac75-605d91f1b10a", "email": "diego.argote.0ds@utap.edu.co", "nombre": "Diego Argote", "email_verified": true, "phone_verified": false}', 'email', '2026-05-25 19:57:23.90262+00', '2026-05-25 19:57:23.902667+00', '2026-05-25 19:57:23.902667+00', '000b6ea8-56c9-4ce1-a817-49afbd72d3bb');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('196051d4-056e-437a-9380-f2fedc13c859', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-25 20:00:12.821234+00', '2026-05-25 20:00:12.821234+00', NULL, 'aal1', NULL, NULL, 'node', '181.50.178.146', NULL, NULL, NULL, NULL, NULL),
	('79c23ac1-ea7d-482f-81f7-5ea67435d669', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-26 16:27:54.589808+00', '2026-05-26 16:27:54.589808+00', NULL, 'aal1', NULL, NULL, 'node', '190.109.15.36', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('196051d4-056e-437a-9380-f2fedc13c859', '2026-05-25 20:00:12.840875+00', '2026-05-25 20:00:12.840875+00', 'password', '279eacd8-bae5-433c-8f99-856eeb2dfdc1'),
	('79c23ac1-ea7d-482f-81f7-5ea67435d669', '2026-05-26 16:27:54.650649+00', '2026-05-26 16:27:54.650649+00', 'password', 'af9b77c0-3907-40c8-9a50-dd8e0e52c224');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 151, 'iviou422avei', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', false, '2026-05-25 20:00:12.83368+00', '2026-05-25 20:00:12.83368+00', NULL, '196051d4-056e-437a-9380-f2fedc13c859'),
	('00000000-0000-0000-0000-000000000000', 152, 'kbxhosrsrzxi', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', false, '2026-05-26 16:27:54.617372+00', '2026-05-26 16:27:54.617372+00', NULL, '79c23ac1-ea7d-482f-81f7-5ea67435d669');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: salas; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."salas" ("id", "nombre", "descripcion", "capacidad", "ubicacion", "imagen_url", "estado", "created_at") VALUES
	('ffa5445d-6566-4d43-94ee-53855532d99e', 'Sala de Estudio Grupal B', 'Sala silenciosa para trabajo en equipo con enchufes en mesa.', 8, 'Biblioteca, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878491047-31hvs6kzrv.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('20b69fdd-f2a5-4eea-957d-8013a47328fb', 'Sala de Conferencias A', 'Sala ejecutiva con pantalla 4K y sistema de videoconferencia.', 20, 'Edificio Principal, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878442711-j4iqt3smwzl.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('d4192277-f1af-4b01-a2c4-0a0656353441', 'Cubículo de Investigación 1', 'Espacio para investigadores con escritorios individuales.', 6, 'Edificio Posgrado, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1779456165664-ox2j8xxpxx.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('44a4502a-af9e-4c4c-b87a-3381298d39c5', 'Sala B — Creatividad', 'Espacio de brainstorming con paredes de vidrio y mesas modulares.', 8, 'Piso 2, Ala Sur', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778340996237-23ygic23y3g.jpg', 'disponible', '2026-04-18 20:26:39.801864+00'),
	('daf56b36-35d6-42f1-a699-a142cfbd7d51', 'Sala Board ITAM', 'Sala de juntas directivas con mesa ovalada y sillones premium.', 12, 'Torre Administrativa, Piso 4', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878401016-lpkz8hlkpt.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('d7659279-045c-4e7e-8816-6edf87b51e41', 'Auditorio Principal', 'Auditorio corporativo con escenario, proyector 4K y sistema de audio profesional.', 50, 'Planta Baja', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878026772-e9ojkxy5a36.jpg', 'mantenimiento', '2026-04-18 20:26:39.801864+00'),
	('4b30ba70-625f-42cb-b34e-d02ca35ef0a2', 'Auditorio Sur', 'Auditorio secundario, ideal para presentaciones de proyectos.', 80, 'Edificio Académico, PB', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878302818-xe5gkqjeqn.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('8e0f4019-fb52-47d3-ad5d-5d35f5e66cf1', 'Aula Multimedia 201', 'Aula con pantalla interactiva Smart Board de 86 pulgadas.', 40, 'Edificio Académico, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878342441-hznmjjwuu0f.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('affe29fa-5b52-4883-9e72-1a03ad963953', 'Sala de Posgrado 2', 'Sala de defensa de tesis con sistema de grabación integrado.', 15, 'Edificio Posgrado, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878561534-kvvab3obq4.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('7c194700-f745-4ed2-9f75-33eeaadfb292', 'Sala de Capacitación TI', 'Sala especializada en formación tecnológica con 20 laptops.', 20, 'Edificio Centro de Cómputo, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878431951-df7oa6w9fk.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('d38e1a24-b83f-4624-9011-7868ddcb23c9', 'Sala de Conferencias B', 'Sala equipada con proyector y pizarrón interactivo.', 16, 'Edificio Principal, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878457463-reosqkgp4ao.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('f8d4a255-803e-4e91-adef-beb27ab4d28d', 'Sala de Estudio Grupal A', 'Espacio colaborativo con mesas modulares y pizarrones blancos.', 10, 'Biblioteca, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878471191-ilulkt9hzhq.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('14c9a484-cb16-4b32-bbdb-481802a61a4e', 'Laboratorio de Cómputo 1', 'Lab con 30 estaciones Dell, acceso a software MATLAB y SPSS.', 30, 'Edificio Centro de Cómputo, PB', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1779456067304-3nodashpb0i.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'Auditorio Norte', 'Auditorio principal con sonido envolvente y acceso para sillas.', 120, 'Edificio Principal, PB', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878012557-qwja04qhbj.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('f9d8408d-d3a9-419a-a673-f0aeeec91ee7', 'Sala de Innovación', 'Espacio maker con mesas altas, pantallas móviles y pizarrones.', 18, 'Centro de Innovación, PB', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878507903-ufeal350xh.jpeg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('0dd7cf59-c2b4-4e3b-8d88-5e9e6b24c8e6', 'Sala de Posgrado 1', 'Sala para seminarios de maestría y doctorado con mesas en U.', 20, 'Edificio Posgrado, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878533703-9wo5fveua5h.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('f167d12a-68f1-485e-a10a-c37220745bfa', 'Sala de Reuniones Ejecutiva', 'Sala premium con equipo de telepresencia Cisco Webex.', 8, 'Torre Administrativa, Piso 3', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878570542-6omzbo3v1z.jpg', 'mantenimiento', '2026-05-15 18:43:40.826837+00'),
	('5b7d9c5a-f781-48bc-8746-e54c6c6beb3f', 'Laboratorio de Cómputo 2', 'Lab con 30 estaciones HP, acceso a Adobe Creative Suite.', 30, 'Edificio Centro de Cómputo, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1779456078224-3vtqpuwq5g3.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('30c94a6a-a9bf-4f3c-9146-090083a9ed41', 'Cubículo de Investigación 2', 'Espacio para proyectos de investigación conjunta.', 6, 'Edificio Posgrado, Piso 2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1779456157007-xlt16f1xvhh.jpg', 'disponible', '2026-05-15 18:43:40.826837+00'),
	('5f48f5d5-b85c-4307-bc7c-8a56804415db', 'Sala VALIDACIONES DELETE', 'Validacion de delete', 50, 'CC chipichape', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778890639305-qmzp4y764mq.jpeg', 'disponible', '2026-05-16 00:17:27.001132+00'),
	('81a52c39-1b5b-4e96-89ed-dcf04053d1b0', 'Sala Reuniones Profesionales', 'Sala integrada con equipos audivisuales', 50, 'CC Centenario', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1779455983642-mzetym5evze.webp', 'disponible', '2026-05-22 13:19:46.379112+00'),
	('161e09b8-1a53-4a21-8472-d8363d44ad4a', 'Aula Multimedia 101', 'Aula con proyector dual, sistema de audio y capacidad ambiental.', 35, 'Edificio Académico, Piso 1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/salas/1778878329001-7wl8mp7fki6.jpg', 'disponible', '2026-05-15 18:43:40.826837+00');


--
-- Data for Name: equipos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."equipos" ("id", "nombre", "imagen_url", "created_at", "categoria", "sistema_operativo", "marca", "tipo_equipo", "estado", "numero_serie", "sala_id") VALUES
	('25b391b7-8bf6-424b-ab7c-511a41422182', 'HP EliteBook 840 G9 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778871349202-wewcqu1vetp.png', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'hp', 'portatil', 'disponible', 'HP-EB840G9-001', NULL),
	('bc138004-fc68-41e8-a88a-6b499a067de0', 'HP Probook #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778345568799-f8pn2vt1sks.jpeg', '2026-05-09 16:52:51.855131+00', 'ordenador', 'windows', 'hp', 'portatil', 'disponible', '123324', NULL),
	('c5d86029-9b12-4bed-8a74-772eddcfb742', 'Dell probook #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778356821896-3dlhvichwld.png', '2026-05-09 20:00:27.307818+00', 'ordenador', 'windows', 'dell', 'portatil', 'disponible', '1234dell2', NULL),
	('834ce58f-3dde-4efc-8317-7904c6d8fca4', 'Dell probook Ultra #3', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778356821896-3dlhvichwld.png', '2026-05-09 20:00:28.221523+00', 'movil', 'ios', 'apple', 'tablet', 'mantenimiento', '1234dell3', NULL),
	('c9ec8284-5ac9-44a6-b074-54809ca9005d', 'Impresora HP LaserJet Pro', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877350504-a28oh9il74a.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'HP', 'impresora', 'disponible', 'HP-LJPRO-001', NULL),
	('4215bc42-d1b6-4374-b652-d56014c2280d', 'Dell probook #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778356821896-3dlhvichwld.png', '2026-05-09 20:00:26.54559+00', 'ordenador', 'windows', 'dell', 'portatil', 'disponible', '1234dell1', NULL),
	('2db7deda-d864-45b4-bb89-b965b523ba4c', 'iMac 24" M3 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778873503730-yg5vq0otlu.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'macos', 'apple', 'escritorio', 'disponible', 'AP-IMAC24-001', NULL),
	('7c17a4a1-96c3-4406-b7ad-cf992e22309d', 'Monitor LG 27" 4K #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877642527-loouabpy3fb.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'LG', 'monitor', 'disponible', 'LG-27UK850-001', NULL),
	('f9f43329-4ba8-4099-82f5-af9f6e53a506', 'iPad Pro 12.9" #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877340912-5mabuaqpsip.jpg', '2026-05-15 18:43:40.826837+00', 'movil', 'ios', 'apple', 'tablet', 'disponible', 'AP-IPADPRO-001', NULL),
	('40c2cd40-26ab-4849-afff-a55a0041745f', 'Dell Latitude 5520 #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778871335849-nd1bslmxbqq.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'dell', 'portatil', 'reservado', 'DL-LAT5520-002', NULL),
	('f45c8cec-85f9-4111-ab6a-ce08683d9325', 'iPad Pro 12.9" #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877361352-q3fqj4w39.jpg', '2026-05-15 18:43:40.826837+00', 'movil', 'ios', 'apple', 'tablet', 'disponible', 'AP-IPADPRO-002', NULL),
	('bf7c7532-aaaf-4b4f-9751-7dc8e2da6cc9', 'Lenovo ThinkPad X1 Carbon #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877376172-4kkwxpixunt.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'lenovo', 'portatil', 'disponible', 'LV-X1C-001', NULL),
	('a3fce809-844a-44fe-a34c-e83cb7e02241', 'Lenovo ThinkPad X1 Carbon #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877390240-7hx0xkawxte.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'lenovo', 'portatil', 'mantenimiento', 'LV-X1C-002', NULL),
	('8b960c6e-967f-4d0b-942a-77f624789679', 'HP Probook #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778345568799-f8pn2vt1sks.jpeg', '2026-05-09 16:52:51.191999+00', 'ordenador', 'windows', 'hp', 'portatil', 'disponible', '12343', NULL),
	('f7845865-9226-4b0d-aaa7-8d106ed879ba', 'Dell Latitude 5520 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778871298640-grdo8tu0us9.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'dell', 'portatil', 'mantenimiento', 'DL-LAT5520-001', NULL),
	('515b4d5c-b2c9-4ba1-9698-e038a98b7376', 'MacBook Pro 14" M3 #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877630847-ds7ijid6ofp.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'macos', 'apple', 'portatil', 'disponible', 'AP-MBP14M3-002', NULL),
	('051de271-a7d3-4567-9226-8d78a6bd8d2e', 'Monitor LG 27" 4K #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877658135-m9hqce35m5.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'LG', 'monitor', 'mantenimiento', 'LG-27UK850-002', NULL),
	('fac1deb4-5a36-4eb1-b887-47fc16f0c9d6', 'Pizarrón Interactivo Smart Board 75"', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877758807-w3xwjqj3nh.webp', '2026-05-15 18:43:40.826837+00', 'mobiliario', NULL, 'Smart', 'pizarron', 'disponible', 'SM-BOARD75-001', NULL),
	('34db0d00-287c-4ddc-9535-6c8693e8c3f8', 'Proyector Epson EB-L200 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877812814-qxtgwrp6hc7.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'Epson', 'proyector', 'disponible', 'EP-EBL200-001', NULL),
	('b03b5d85-d7ac-409b-ac1d-4cdac319f61c', 'MacBook Pro 14" M3 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877617287-d4oqc1wshsv.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'macos', 'apple', 'portatil', 'disponible', 'AP-MBP14M3-001', NULL),
	('04d241f4-01e3-4ec5-9b00-189075c284c1', 'Samsung Galaxy Tab S9 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877843703-5tj55wqme3.jpg', '2026-05-15 18:43:40.826837+00', 'movil', 'android', 'samsung', 'tablet', 'disponible', 'SS-TABS9-001', NULL),
	('66dc523f-11a0-4271-bde1-5901b78931ed', 'Webcam Logitech C920 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877858438-r7nf64mhsr.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'Logitech', 'webcam', 'disponible', 'LT-C920-001', NULL),
	('c0057896-7729-4394-b071-af07411771af', 'Pizarra #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778879126506-h3qzjqz3fng.webp', '2026-05-15 21:05:29.55488+00', 'mobiliario', 'N/A', 'Generico', 'pizarron', 'disponible', 'AS45', NULL),
	('38e17038-754b-4131-af35-6aae2ebafde5', 'Pizarra #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778879126506-h3qzjqz3fng.webp', '2026-05-15 21:05:30.031878+00', 'mobiliario', 'N/A', 'Generico', 'pizarron', 'disponible', 'AS46', NULL),
	('1ee6c3d0-7878-4d4a-ac08-74f672d184fa', 'MacBook Air M2 #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877604495-w40tezpccy.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'macos', 'apple', 'portatil', 'disponible', 'AP-MBA-M2-001', NULL),
	('22b79666-32d9-4203-86ad-f5bad8991dd9', 'HP EliteBook 840 G9 #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778871370566-remthognk3h.jpg', '2026-05-15 18:43:40.826837+00', 'ordenador', 'windows', 'hp', 'portatil', 'disponible', 'HP-EB840G9-002', NULL),
	('1d1c7b01-c467-484b-8ffc-572520276836', 'Pizarra #3', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778879126506-h3qzjqz3fng.webp', '2026-05-15 21:05:30.478337+00', 'mobiliario', 'N/A', 'Generico', 'pizarron', 'disponible', 'AS47', NULL),
	('b1032e93-da96-4240-8b94-d5ed7b570d42', 'ASUS PRO MAX #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1779420579514-gr6da1hoa.webp', '2026-05-22 03:29:42.464582+00', 'ordenador', 'windows', 'asus', 'portatil', 'disponible', 'AS14', '0dd7cf59-c2b4-4e3b-8d88-5e9e6b24c8e6'),
	('d01d0bfe-855d-4215-a745-1b83bb7b5dda', 'ASUS PRO', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1779500547249-sfqbf52bkqs.jpg', '2026-05-23 01:42:32.877488+00', 'movil', 'android', 'samsung', 'smartphone', 'disponible', 'AS12', NULL),
	('28b8ef7a-e707-4f97-826e-139a6e5c0420', 'ASUS PRO MAX #3', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1779420579514-gr6da1hoa.webp', '2026-05-22 03:29:42.961063+00', 'ordenador', 'windows', 'asus', 'portatil', 'mantenimiento', 'AS15', NULL),
	('027de53b-6c30-425e-b2fa-dd45ea5f1dc2', 'ASUS PRO MAX #1', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1779420579514-gr6da1hoa.webp', '2026-05-22 03:29:41.948532+00', 'ordenador', 'windows', 'asus', 'portatil', 'disponible', 'AS13', '5f48f5d5-b85c-4307-bc7c-8a56804415db'),
	('8b38e81a-a938-4566-9a9f-d7b615b95c21', 'Proyector Epson EB-L200 #2', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/1778877826751-cb8ztasp28d.jpg', '2026-05-15 18:43:40.826837+00', 'periferico', NULL, 'Epson', 'proyector', 'disponible', 'EP-EBL200-002', NULL);


--
-- Data for Name: reservas; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reservas" ("id", "usuario_id", "sala_id", "titulo", "fecha", "hora_inicio", "hora_fin", "estado", "created_at") VALUES
	('f04e113a-86c5-4175-bf00-5caca3677dac', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', 'VALIDACIONES', '2026-05-22', '19:39:00', '20:39:00', 'cancelada', '2026-05-16 00:39:27.841893+00'),
	('b87d8039-c073-41e7-8f2c-865a9b424905', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', 'VALIDACIONES', '2026-05-29', '19:40:00', '21:40:00', 'confirmada', '2026-05-16 00:40:51.435377+00'),
	('ac491470-ce98-49fa-a3ac-33d6bc97362d', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'PRUBEA', '2026-05-30', '14:14:00', '15:14:00', 'confirmada', '2026-05-18 19:14:47.378398+00'),
	('8bc278be-5d88-4efc-96c4-57005a63f911', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'PRUEBA', '2026-05-30', '01:17:00', '13:17:00', 'confirmada', '2026-05-18 19:18:25.939779+00'),
	('b6bf66dc-4f98-4996-999f-034ee0c1667d', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'purebasa', '2026-06-18', '04:52:00', '10:52:00', 'confirmada', '2026-05-18 19:52:12.958319+00'),
	('0f535232-db99-4a03-a03c-feb09d15f89c', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'rpuebas', '2026-06-26', '16:56:00', '17:56:00', 'confirmada', '2026-05-18 19:56:11.856283+00'),
	('6cc31f4e-026b-4654-86d6-a0355befc077', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', 'asas', '2026-05-21', '20:00:00', '22:00:00', 'confirmada', '2026-05-21 23:53:44.241754+00'),
	('b5b118f0-b094-4652-b650-8a39ba10ec6b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', 'OTRA P', '2026-05-22', '10:33:00', '16:33:00', 'confirmada', '2026-05-22 04:33:33.791134+00'),
	('e0a8cf8c-d333-4915-8bb3-75b3c2f4beff', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', 'VALIDACION', '2026-07-07', '08:01:00', '14:01:00', 'confirmada', '2026-05-22 05:01:20.627601+00'),
	('b805905d-3332-4c0d-830e-45e6e61969f1', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '7957bf0d-9f45-47c3-9fc6-3802dbe53688', 'dasdas', '2026-07-08', '00:00:00', '04:00:00', 'confirmada', '2026-05-22 07:05:06.513142+00'),
	('73222ce1-b401-4b58-8eca-96071e40402c', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', 'ffa5445d-6566-4d43-94ee-53855532d99e', 'asdasd', '2026-07-09', '00:00:00', '02:00:00', 'confirmada', '2026-05-22 07:05:24.038977+00'),
	('3bfc7c11-e856-4ca8-b746-5b32f99b55f8', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '161e09b8-1a53-4a21-8472-d8363d44ad4a', 'asasd', '2026-08-11', '00:00:00', '04:00:00', 'confirmada', '2026-05-22 07:35:34.525957+00'),
	('1f912908-8a53-4be2-9db0-c65385c595b9', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '14c9a484-cb16-4b32-bbdb-481802a61a4e', 'asdasd', '2026-08-12', '00:00:00', '04:00:00', 'confirmada', '2026-05-22 07:35:54.287437+00'),
	('2eb9c5db-a26d-41d0-b069-e5d2de58f451', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', 'd4192277-f1af-4b01-a2c4-0a0656353441', 'Prueba', '2026-05-28', '00:00:00', '01:00:00', 'confirmada', '2026-05-23 19:23:28.518163+00'),
	('a1562d3c-c6e4-4f47-ae19-cf925aa7e7b8', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '8e0f4019-fb52-47d3-ad5d-5d35f5e66cf1', 'VELIDUCAD', '2026-05-27', '00:00:00', '04:00:00', 'confirmada', '2026-05-25 18:18:31.658246+00'),
	('b702fdcd-f91b-451b-b93b-135215711cb1', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '161e09b8-1a53-4a21-8472-d8363d44ad4a', 'TEST', '2026-05-26', '00:00:00', '01:00:00', 'confirmada', '2026-05-25 18:46:38.916781+00');


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."usuarios" ("id", "nombre", "correo", "rol", "created_at", "activo") VALUES
	('d59e97f3-278b-4ff5-98a1-fdf0f703f974', 'Pablo Perez', 'diegoargotepabon@gmail.com', 'admin', '2026-04-25 00:00:52.904737+00', true),
	('3cdf23c0-cc47-4554-ac75-605d91f1b10a', 'Diego Argote', 'diego.argote.0ds@utap.edu.co', 'usuario', '2026-05-25 19:57:23.879625+00', true);


--
-- Data for Name: prestamos_equipo; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."prestamos_equipo" ("id", "equipo_id", "usuario_id", "sala_id", "fecha_inicio", "fecha_fin_esperada", "fecha_devolucion", "estado", "notas", "created_at", "reserva_id", "condicion_entrega", "condicion_devolucion", "foto_devolucion_url", "observaciones_devolucion", "novedad", "tipo_novedad", "descripcion_novedad", "notas_admin", "num_acta") VALUES
	('346d1657-8462-4662-aef7-cc0a945de997', 'f7845865-9226-4b0d-aaa7-8d106ed879ba', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-30 00:40:00+00', '2026-05-30 02:40:00+00', '2026-05-22 13:14:06.015+00', 'devuelto', NULL, '2026-05-22 03:35:40.319416+00', 'b87d8039-c073-41e7-8f2c-865a9b424905', 'bueno', 'bueno', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/devoluciones/devolucion-1779454310507-osqg64pcm4k.webp', NULL, true, 'dano_fisico', 'Mantenimiento', 'Mantenimiento', 'ACT-20260522-DE2366'),
	('97b3c0fb-fc08-4fbf-b478-e34967c1a0d3', '40c2cd40-26ab-4849-afff-a55a0041745f', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-22 13:14:06.411+00', '2026-05-30 02:40:00+00', NULL, 'activo', 'Reemplazo del equipo original (acta vinculada al préstamo 346d1657-8462-4662-aef7-cc0a945de997)', '2026-05-22 13:14:07.407904+00', 'b87d8039-c073-41e7-8f2c-865a9b424905', 'bueno', NULL, NULL, NULL, false, NULL, NULL, NULL, 'ACT-20260522-CD9F62'),
	('09fb5bb1-a216-4cc0-846a-606bee3a97c3', '027de53b-6c30-425e-b2fa-dd45ea5f1dc2', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-22 13:12:33.678+00', '2026-05-22 21:33:00+00', '2026-05-22 14:07:50.478+00', 'devuelto', 'Reemplazo del equipo original (acta vinculada al préstamo 684d1cec-4793-4f49-bfe2-0a43f0545604)', '2026-05-22 13:12:34.888238+00', 'b5b118f0-b094-4652-b650-8a39ba10ec6b', 'bueno', 'dano_leve', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/devoluciones/devolucion-1779458869135-wc33p2li7yq.webp', NULL, true, 'dano_fisico', 'Teclas espacio no funciona', NULL, 'ACT-20260522-4803FF'),
	('c28af20d-82c1-4f81-8928-f5d46e0aa5b1', '1d1c7b01-c467-484b-8ffc-572520276836', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-30 00:40:00+00', '2026-05-30 02:40:00+00', NULL, 'activo', NULL, '2026-05-23 00:05:19.785779+00', 'b87d8039-c073-41e7-8f2c-865a9b424905', 'bueno', NULL, NULL, NULL, false, NULL, NULL, NULL, 'ACT-20260523-DC42F7'),
	('a8028a82-8da8-4dbf-9d57-44699c707b8e', 'c9ec8284-5ac9-44a6-b074-54809ca9005d', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-30 00:40:00+00', '2026-05-30 02:40:00+00', '2026-05-22 01:57:44.274+00', 'devuelto', 'Daño en el sistema ', '2026-05-22 01:48:42.347225+00', 'b87d8039-c073-41e7-8f2c-865a9b424905', 'dano_leve', 'dano_leve', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/devoluciones/devolucion-1779415062205-44say2zrage.jpg', NULL, true, 'dano_fisico', 'Se entrega en el mismo estado', NULL, 'ACT-20260522-ACC0A2'),
	('78db97bf-ceaf-4b62-bff4-66705fac7f53', 'f7845865-9226-4b0d-aaa7-8d106ed879ba', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-30 00:40:00+00', '2026-05-30 02:40:00+00', '2026-05-22 03:33:02.273+00', 'devuelto', NULL, '2026-05-21 23:29:57.701369+00', 'b87d8039-c073-41e7-8f2c-865a9b424905', 'bueno', 'bueno', NULL, NULL, false, NULL, NULL, 'OK sin novedades', 'ACT-20260521-B3FC46'),
	('371c0c80-b66f-4d51-bce5-7f1f1225836b', '027de53b-6c30-425e-b2fa-dd45ea5f1dc2', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-22 15:33:00+00', '2026-05-22 21:33:00+00', '2026-05-22 08:20:55.421+00', 'devuelto', NULL, '2026-05-22 04:33:33.963842+00', 'b5b118f0-b094-4652-b650-8a39ba10ec6b', 'bueno', 'bueno', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/devoluciones/devolucion-1779438052656-bdw8kximz1b.webp', NULL, false, NULL, NULL, NULL, 'ACT-20260522-C844D7'),
	('d5d416da-f453-4f5a-bdbf-8644203e9df2', 'f7845865-9226-4b0d-aaa7-8d106ed879ba', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-07-07 13:01:00+00', '2026-07-07 19:01:00+00', NULL, 'activo', NULL, '2026-05-22 12:51:17.427037+00', 'e0a8cf8c-d333-4915-8bb3-75b3c2f4beff', 'bueno', NULL, NULL, NULL, false, NULL, NULL, NULL, 'ACT-20260522-110AA3'),
	('684d1cec-4793-4f49-bfe2-0a43f0545604', '28b8ef7a-e707-4f97-826e-139a6e5c0420', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '5f48f5d5-b85c-4307-bc7c-8a56804415db', '2026-05-22 15:33:00+00', '2026-05-22 21:33:00+00', '2026-05-22 13:12:33.084+00', 'devuelto', NULL, '2026-05-22 08:13:24.168756+00', 'b5b118f0-b094-4652-b650-8a39ba10ec6b', 'bueno', 'bueno', 'https://rjjegwjqjsrmcjmgghuz.supabase.co/storage/v1/object/public/equipos/devoluciones/devolucion-1779439223959-u4ijtlxqzsb.webp', NULL, true, 'dano_fisico', 'Se reemplaza por mantenimiento', 'Se reemplaza por mantenimiento', 'ACT-20260522-2FEF96');


--
-- Data for Name: reserva_equipos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reserva_equipos" ("id", "reserva_id", "equipo_id", "created_at") VALUES
	('74695497-a280-4d6e-b4b4-ea5d131cca7d', 'b5b118f0-b094-4652-b650-8a39ba10ec6b', '027de53b-6c30-425e-b2fa-dd45ea5f1dc2', '2026-05-22 04:33:34.109262+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('equipos', 'equipos', NULL, '2026-05-09 15:17:18.872636+00', '2026-05-09 15:17:18.872636+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('salas', 'salas', NULL, '2026-05-09 15:17:18.872636+00', '2026-05-09 15:17:18.872636+00', true, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('b1ba7210-9135-4877-a9b1-90b4af106723', 'salas', '1778340227640-z3uqb5t99ef.jpeg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-09 15:23:48.072869+00', '2026-05-09 15:23:48.072869+00', '2026-05-09 15:23:48.072869+00', '{"eTag": "\"ace4c698062f77e14b3938473ede74fa\"", "size": 43421, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-09T15:23:49.000Z", "contentLength": 43421, "httpStatusCode": 200}', 'f0b3dd4f-c5ce-4398-8e22-7a0c16b0fce1', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('afef21ad-3640-4663-ab89-c936d9825615', 'equipos', 'devoluciones/devolucion-1779414797091-3otayzsmul4.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 01:53:18.112053+00', '2026-05-22 01:53:18.112053+00', '2026-05-22 01:53:18.112053+00', '{"eTag": "\"a2bf1a172f5c4dbda9d44237dddd5ad3\"", "size": 6398, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T01:53:19.000Z", "contentLength": 6398, "httpStatusCode": 200}', 'a2020c1a-71d9-4cb4-9a92-3e20b8482597', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('5721b2ef-38e9-47a7-88b2-c06275946fc1', 'salas', '1778340980812-zj5kyfebxxe.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-09 15:36:21.446462+00', '2026-05-09 15:36:21.446462+00', '2026-05-09 15:36:21.446462+00', '{"eTag": "\"b4181a35d9e1e5fc7a4aafbc36de79a8\"", "size": 92148, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-09T15:36:22.000Z", "contentLength": 92148, "httpStatusCode": 200}', 'd76c3405-d85e-4b37-bdac-0bc544a0ee35', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b44e1139-bc23-4b01-a074-cdbd13ad7e90', 'salas', '1778340996237-23ygic23y3g.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-09 15:36:36.996913+00', '2026-05-09 15:36:36.996913+00', '2026-05-09 15:36:36.996913+00', '{"eTag": "\"2591a71a5ba4b7602bca3bf0c7ba0d51\"", "size": 145216, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-09T15:36:37.000Z", "contentLength": 145216, "httpStatusCode": 200}', '9d424230-612b-42b4-9ff3-f7d8370b24f0', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('ee88cc29-3f22-4383-b0b2-5b4ddf3c4765', 'equipos', 'devoluciones/devolucion-1779415062205-44say2zrage.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 01:57:43.347619+00', '2026-05-22 01:57:43.347619+00', '2026-05-22 01:57:43.347619+00', '{"eTag": "\"a2bf1a172f5c4dbda9d44237dddd5ad3\"", "size": 6398, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T01:57:44.000Z", "contentLength": 6398, "httpStatusCode": 200}', 'a4f2587e-14fe-483e-ad0c-055836b6f717', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('7198c127-5a4d-4aba-beaa-22db825ebb8b', 'equipos', '1778345568799-f8pn2vt1sks.jpeg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-09 16:52:49.674854+00', '2026-05-09 16:52:49.674854+00', '2026-05-09 16:52:49.674854+00', '{"eTag": "\"a832c3a9ec5de7f5cb3d109044b19107\"", "size": 18734, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-09T16:52:50.000Z", "contentLength": 18734, "httpStatusCode": 200}', '1fbd67f4-5a99-4035-bfcb-add576156320', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('acbc9d79-d648-4465-aef2-526ff1e78a16', 'equipos', '1778356821896-3dlhvichwld.png', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-09 20:00:25.498258+00', '2026-05-09 20:00:25.498258+00', '2026-05-09 20:00:25.498258+00', '{"eTag": "\"10d23fc5d55f25993149946ea319022d\"", "size": 194644, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-09T20:00:26.000Z", "contentLength": 194644, "httpStatusCode": 200}', '9e11e00e-17d5-4a87-8ed8-ad30a8ce8f0e', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('8761c967-1a79-4266-81aa-65ef282a5927', 'salas', '1779455983642-mzetym5evze.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 13:19:45.248442+00', '2026-05-22 13:19:45.248442+00', '2026-05-22 13:19:45.248442+00', '{"eTag": "\"9e575bdb19530d70efd0596b0df249bc\"", "size": 41312, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T13:19:46.000Z", "contentLength": 41312, "httpStatusCode": 200}', '63b1c756-eafe-4c4e-9eea-3f0daf25f514', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b09ab148-ef01-4be7-9c4e-7860cc8cc80b', 'equipos', '1778871298640-grdo8tu0us9.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 18:54:59.764307+00', '2026-05-15 18:54:59.764307+00', '2026-05-15 18:54:59.764307+00', '{"eTag": "\"d6b44779379808201117e415fcb8392b\"", "size": 38474, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T18:55:00.000Z", "contentLength": 38474, "httpStatusCode": 200}', '710a64b2-8611-491e-942d-43c97206ad02', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f4652bb1-e9b5-4a13-acd1-fc6e281c7318', 'equipos', '1778871335849-nd1bslmxbqq.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 18:55:36.844506+00', '2026-05-15 18:55:36.844506+00', '2026-05-15 18:55:36.844506+00', '{"eTag": "\"d6b44779379808201117e415fcb8392b\"", "size": 38474, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T18:55:37.000Z", "contentLength": 38474, "httpStatusCode": 200}', '3d2b55b7-5f89-4200-97a6-90eadbbdb703', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('5297b8c8-82da-4971-9dee-9e0b226a57ef', 'equipos', '1778871349202-wewcqu1vetp.png', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 18:55:50.4071+00', '2026-05-15 18:55:50.4071+00', '2026-05-15 18:55:50.4071+00', '{"eTag": "\"5f1c4b605bd4601a0153a7484c8677ff\"", "size": 172903, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T18:55:51.000Z", "contentLength": 172903, "httpStatusCode": 200}', '4d1f5c4b-f00a-493a-8f5b-a40d5c6198d2', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f621e88d-ab38-44a5-8b0f-d034088ddd20', 'equipos', '1778871370566-remthognk3h.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 18:56:11.456637+00', '2026-05-15 18:56:11.456637+00', '2026-05-15 18:56:11.456637+00', '{"eTag": "\"40e1c3844b0115b96dfd7fe4277bc2fe\"", "size": 26184, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T18:56:12.000Z", "contentLength": 26184, "httpStatusCode": 200}', 'ef33bbf2-bea5-4f80-9d82-e026d32dc69f', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('3ddf027a-7aac-4377-baa0-effcc2eb9f0d', 'equipos', '1778873503730-yg5vq0otlu.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 19:31:44.52148+00', '2026-05-15 19:31:44.52148+00', '2026-05-15 19:31:44.52148+00', '{"eTag": "\"ae9625252465ba70d055370a7b24705c\"", "size": 10409, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T19:31:45.000Z", "contentLength": 10409, "httpStatusCode": 200}', '59e2d2b9-e0fe-495a-aafa-4d9db0a9cd5b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('0164a77f-6e85-4ca6-a6ad-c2f1a73c4d29', 'equipos', '1778877274760-s43opcjugoi.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:34:37.418832+00', '2026-05-15 20:34:37.418832+00', '2026-05-15 20:34:37.418832+00', '{"eTag": "\"6fb43133c2e22fb1831a60be4332f977\"", "size": 6294, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:34:38.000Z", "contentLength": 6294, "httpStatusCode": 200}', '2deaa80d-0f06-48d3-ae93-076737abda27', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f54d1297-6a0c-4f91-a0eb-65fc5cee8b17', 'equipos', '1779420579514-gr6da1hoa.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 03:29:41.036359+00', '2026-05-22 03:29:41.036359+00', '2026-05-22 03:29:41.036359+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T03:29:41.000Z", "contentLength": 36180, "httpStatusCode": 200}', '24203f88-c486-487f-b458-96c1485f0bc1', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('c7041329-465a-4ebd-869c-a056686b869a', 'equipos', '1778877340912-5mabuaqpsip.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:35:43.105314+00', '2026-05-15 20:35:43.105314+00', '2026-05-15 20:35:43.105314+00', '{"eTag": "\"40e1c3844b0115b96dfd7fe4277bc2fe\"", "size": 26184, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:35:44.000Z", "contentLength": 26184, "httpStatusCode": 200}', '94ba9b57-63cf-409e-acda-86ac6757d32d', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('30b26b03-ad01-4b55-b5ff-b8020390f364', 'salas', '1779456067304-3nodashpb0i.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 13:21:09.445361+00', '2026-05-22 13:21:09.445361+00', '2026-05-22 13:21:09.445361+00', '{"eTag": "\"83a3ea8bedfbe6e0ae37da0fe9de876b\"", "size": 4384374, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T13:21:10.000Z", "contentLength": 4384374, "httpStatusCode": 200}', '0c0db8fb-0f8e-4239-9ce8-556cea259360', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('cc2d7d64-c1f5-4113-86ca-a78e3dd4bd9e', 'equipos', '1778877350504-a28oh9il74a.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:35:52.53001+00', '2026-05-15 20:35:52.53001+00', '2026-05-15 20:35:52.53001+00', '{"eTag": "\"3039b2ecf022bb3a8f7137b431c1aa88\"", "size": 5527, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:35:53.000Z", "contentLength": 5527, "httpStatusCode": 200}', 'd7cee3ca-8172-47e6-95e8-7bc4ee37fb7e', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f4859e31-6900-4f1f-a5e3-8addbd5abb09', 'equipos', '1778877361352-q3fqj4w39.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:36:03.349627+00', '2026-05-15 20:36:03.349627+00', '2026-05-15 20:36:03.349627+00', '{"eTag": "\"40e1c3844b0115b96dfd7fe4277bc2fe\"", "size": 26184, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:36:04.000Z", "contentLength": 26184, "httpStatusCode": 200}', '18362631-5d7f-423c-83b6-7dd12153f05a', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('2fb9dab7-9f7f-4576-ac09-dcda6d24bfda', 'salas', '1779456165664-ox2j8xxpxx.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 13:22:47.245022+00', '2026-05-22 13:22:47.245022+00', '2026-05-22 13:22:47.245022+00', '{"eTag": "\"fa7c986fe540b802556a212aded69580\"", "size": 165033, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T13:22:48.000Z", "contentLength": 165033, "httpStatusCode": 200}', '83e8b907-a1fb-4fb1-b89e-e85e7d506eaf', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('436ff28d-b2d2-460e-9879-971b7d9af82c', 'equipos', '1778877376172-4kkwxpixunt.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:36:18.115765+00', '2026-05-15 20:36:18.115765+00', '2026-05-15 20:36:18.115765+00', '{"eTag": "\"4cade483a5a3405d3e448817bd08f330\"", "size": 8078, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:36:19.000Z", "contentLength": 8078, "httpStatusCode": 200}', '232757da-33e9-40dd-b5e0-5fd9c2c60cc7', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('88257f94-82e2-4268-957c-1b4fef62b4f6', 'equipos', '1778877390240-7hx0xkawxte.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:36:32.179983+00', '2026-05-15 20:36:32.179983+00', '2026-05-15 20:36:32.179983+00', '{"eTag": "\"429e4a7d9cef4faeac58f818e93c9115\"", "size": 9576, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:36:33.000Z", "contentLength": 9576, "httpStatusCode": 200}', 'ebdb2bd8-cfeb-4a94-a45c-fcebf026231e', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('8d8a2b55-46bc-4079-a353-d4228296f7a3', 'equipos', '1778877604495-w40tezpccy.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:40:06.602443+00', '2026-05-15 20:40:06.602443+00', '2026-05-15 20:40:06.602443+00', '{"eTag": "\"e262f3c417c0ba0472255b0e3d06b9b0\"", "size": 10483, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:40:07.000Z", "contentLength": 10483, "httpStatusCode": 200}', '2800a20e-e2d2-4ff4-b02a-b8522af840b7', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('86166e1a-da9b-4295-927b-07450098be45', 'equipos', '1778877617287-d4oqc1wshsv.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:40:19.228488+00', '2026-05-15 20:40:19.228488+00', '2026-05-15 20:40:19.228488+00', '{"eTag": "\"c7f5ea4d0855b0760b60faf1adc7cde8\"", "size": 11391, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:40:20.000Z", "contentLength": 11391, "httpStatusCode": 200}', '482136b0-6292-490e-9319-8e14a5e28e83', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('661bb2b1-ec0e-4723-a1c0-cab9a718dc33', 'equipos', '1778877630847-ds7ijid6ofp.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:40:32.984603+00', '2026-05-15 20:40:32.984603+00', '2026-05-15 20:40:32.984603+00', '{"eTag": "\"b6fde5231c54042ef6bab12e32d82c4d\"", "size": 4832, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:40:33.000Z", "contentLength": 4832, "httpStatusCode": 200}', '8a479430-4437-4a85-b120-4f4f4ee85e45', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('c57ccf45-ab5f-4dad-9e3e-6147a56d59f1', 'equipos', '1778877642527-loouabpy3fb.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:40:44.469161+00', '2026-05-15 20:40:44.469161+00', '2026-05-15 20:40:44.469161+00', '{"eTag": "\"ba4c460ad7d5f68796a083afedd2e720\"", "size": 10024, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:40:45.000Z", "contentLength": 10024, "httpStatusCode": 200}', '338f2b05-f21d-46c0-bb83-bb77c649a49b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f35cc39a-c543-4a24-b622-869ff05cc6ac', 'equipos', '1778877658135-m9hqce35m5.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:41:00.114484+00', '2026-05-15 20:41:00.114484+00', '2026-05-15 20:41:00.114484+00', '{"eTag": "\"c8ceb7b6c1e40be7f649bc09cdda6d0e\"", "size": 10860, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:41:01.000Z", "contentLength": 10860, "httpStatusCode": 200}', '38a843cb-8018-4efd-b118-1a4d04d55809', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('dc17681c-69b0-4739-b6ed-0f0704722ed5', 'equipos', 'devoluciones/devolucion-1779438052656-bdw8kximz1b.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 08:20:55.035503+00', '2026-05-22 08:20:55.035503+00', '2026-05-22 08:20:55.035503+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T08:20:55.000Z", "contentLength": 36180, "httpStatusCode": 200}', 'cbc98c01-19d9-494a-906a-3eaec0834070', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('bb0268f0-8df6-4465-97dd-e98dd76b416b', 'equipos', '1778877758807-w3xwjqj3nh.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:42:41.092268+00', '2026-05-15 20:42:41.092268+00', '2026-05-15 20:42:41.092268+00', '{"eTag": "\"b8fb7d6016e4e70592d6aef8c7238c5e\"", "size": 40704, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:42:42.000Z", "contentLength": 40704, "httpStatusCode": 200}', '35df52c9-df3e-4ba4-9160-490c6dc54a44', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('eba7e31e-e3c5-47af-b98a-52c86baf1f69', 'equipos', '1778877812814-qxtgwrp6hc7.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:43:34.826144+00', '2026-05-15 20:43:34.826144+00', '2026-05-15 20:43:34.826144+00', '{"eTag": "\"40b9da75f351ac8ce91a417dc73eaabb\"", "size": 2801, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:43:35.000Z", "contentLength": 2801, "httpStatusCode": 200}', '441b14f9-1655-4b4a-8c4e-e4da2505c07b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('af5c83c5-3c53-4fd4-ad8d-d0a7df4acba2', 'salas', '1779456078224-3vtqpuwq5g3.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 13:21:20.283041+00', '2026-05-22 13:21:20.283041+00', '2026-05-22 13:21:20.283041+00', '{"eTag": "\"83a3ea8bedfbe6e0ae37da0fe9de876b\"", "size": 4384374, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T13:21:21.000Z", "contentLength": 4384374, "httpStatusCode": 200}', 'bfed4fa1-412a-44bd-b646-f3b7d19cde4f', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('157d2aaf-f132-4933-9c24-713e80c616fc', 'equipos', '1778877843703-5tj55wqme3.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:44:05.646305+00', '2026-05-15 20:44:05.646305+00', '2026-05-15 20:44:05.646305+00', '{"eTag": "\"fb6aaebe8b25f68f0e66bf796ff63386\"", "size": 5858, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:44:06.000Z", "contentLength": 5858, "httpStatusCode": 200}', '1a7f433d-7b07-40be-84ed-ac9edb2d1274', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('ba04dedd-b1cc-459d-b86c-90c9e2cd1963', 'salas', '1778878012557-qwja04qhbj.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:46:54.694029+00', '2026-05-15 20:46:54.694029+00', '2026-05-15 20:46:54.694029+00', '{"eTag": "\"9d5a90bd27a532f82cb999d6973d466b\"", "size": 9039, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:46:55.000Z", "contentLength": 9039, "httpStatusCode": 200}', '9c5e7cab-b5e3-44f7-aa7a-7bfc60bafcf4', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b3b3348a-d556-4421-aeaf-0c801c31938c', 'salas', '1779456157007-xlt16f1xvhh.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 13:22:38.54078+00', '2026-05-22 13:22:38.54078+00', '2026-05-22 13:22:38.54078+00', '{"eTag": "\"fa7c986fe540b802556a212aded69580\"", "size": 165033, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T13:22:39.000Z", "contentLength": 165033, "httpStatusCode": 200}', '1d1924d8-54d1-45bc-831f-78bf40a9c9f4', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('bc5d29c1-c3fb-4b18-ac81-8d8fc0458b43', 'salas', '1778878026772-e9ojkxy5a36.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:47:08.713362+00', '2026-05-15 20:47:08.713362+00', '2026-05-15 20:47:08.713362+00', '{"eTag": "\"204036c1e58827b61173cb6e897e12bc\"", "size": 10589, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:47:09.000Z", "contentLength": 10589, "httpStatusCode": 200}', '647cb3d5-d136-406b-9132-caa59bef4f69', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('078c7aef-8af4-470a-962e-3525166110ed', 'salas', '1778878302818-xe5gkqjeqn.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:51:44.907395+00', '2026-05-15 20:51:44.907395+00', '2026-05-15 20:51:44.907395+00', '{"eTag": "\"633c49963b000844df5cff0e4d4c0084\"", "size": 11309, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:51:45.000Z", "contentLength": 11309, "httpStatusCode": 200}', '4abb3792-a850-4dd2-b15c-20562af00ab7', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b8f392ba-56e4-439e-ae35-45ac227333f3', 'salas', '1778878342441-hznmjjwuu0f.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:52:24.473581+00', '2026-05-15 20:52:24.473581+00', '2026-05-15 20:52:24.473581+00', '{"eTag": "\"376a9bdff2fdab938fa005d8f8b9c186\"", "size": 8074, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:52:25.000Z", "contentLength": 8074, "httpStatusCode": 200}', '2fd7c71d-9855-4cdf-9eb6-60cb8095b6a7', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b4d562e5-e18d-4c8f-b4d0-c6adbf979120', 'salas', '1778878367008-u2mqkpj0p69.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:52:49.024366+00', '2026-05-15 20:52:49.024366+00', '2026-05-15 20:52:49.024366+00', '{"eTag": "\"42b2775107a95b8d019a1c7ba2ed3b23\"", "size": 10422, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:52:49.000Z", "contentLength": 10422, "httpStatusCode": 200}', '9951aca7-1d24-4fbf-9e32-08c1e9a61894', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('c0bc1dc9-8f61-4232-8780-dc79fbac699a', 'salas', '1778878390160-hm54h8nw5g5.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:53:12.178632+00', '2026-05-15 20:53:12.178632+00', '2026-05-15 20:53:12.178632+00', '{"eTag": "\"79844f79ec661ec08c94aeafc4647ab0\"", "size": 8187, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:53:13.000Z", "contentLength": 8187, "httpStatusCode": 200}', '5a3e5a54-c5e3-4cba-9151-92be24bf52dc', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('cd85aa38-a3eb-4a1c-b0c2-4a6d9064f992', 'equipos', '1778877826751-cb8ztasp28d.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:43:48.762705+00', '2026-05-15 20:43:48.762705+00', '2026-05-15 20:43:48.762705+00', '{"eTag": "\"2c84ad4d505508bdc2d1c2ffc57b2720\"", "size": 3231, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:43:49.000Z", "contentLength": 3231, "httpStatusCode": 200}', '337b8a1f-2d44-4010-b529-a0401bae49e6', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('6b1ba17c-c492-4de5-9cee-90dc51bdcaa7', 'equipos', 'devoluciones/devolucion-1779438186755-gzalxrof84v.webp', '287597e7-876e-488c-8353-8ebd23ebd84c', '2026-05-22 08:23:08.074493+00', '2026-05-22 08:23:08.074493+00', '2026-05-22 08:23:08.074493+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T08:23:09.000Z", "contentLength": 36180, "httpStatusCode": 200}', '8305c1d5-ac10-413c-833d-24d14082f9a5', '287597e7-876e-488c-8353-8ebd23ebd84c', '{}'),
	('405111ee-f142-48e9-ba71-06d6143772bb', 'equipos', '1778877858438-r7nf64mhsr.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:44:20.37797+00', '2026-05-15 20:44:20.37797+00', '2026-05-15 20:44:20.37797+00', '{"eTag": "\"df164c9b548f93930ed7ab7a0eb9cced\"", "size": 2323, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:44:21.000Z", "contentLength": 2323, "httpStatusCode": 200}', 'e80c0d1a-9155-4b4b-b7bc-5d1bd856ea70', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('9ee28ee7-da2d-458e-bfcf-b3d613373ef8', 'salas', '1778878329001-7wl8mp7fki6.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:52:10.942398+00', '2026-05-15 20:52:10.942398+00', '2026-05-15 20:52:10.942398+00', '{"eTag": "\"ddf0ccdb4f297e222f4260e32063f221\"", "size": 10648, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:52:11.000Z", "contentLength": 10648, "httpStatusCode": 200}', 'c62b11b8-1b12-420c-8be9-fac493794da8', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('cbdd1494-6363-4a2f-99fb-478ae32ca869', 'equipos', 'devoluciones/devolucion-1779458869135-wc33p2li7yq.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 14:07:50.844364+00', '2026-05-22 14:07:50.844364+00', '2026-05-22 14:07:50.844364+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T14:07:51.000Z", "contentLength": 36180, "httpStatusCode": 200}', 'f1141eaf-cdf7-45b8-9c5f-93e37fee00fc', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('4a2a7757-dc32-453b-a78b-96dc1c40e001', 'salas', '1778878359041-ip94nzb1ccj.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:52:41.184598+00', '2026-05-15 20:52:41.184598+00', '2026-05-15 20:52:41.184598+00', '{"eTag": "\"73a13ea224b7ee0e1165163368798e6b\"", "size": 7828, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:52:42.000Z", "contentLength": 7828, "httpStatusCode": 200}', '9632627a-59a9-4804-b3c4-8ae6ceb0f494', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('6041589c-9964-44e0-9bc6-21f0cc42b854', 'salas', '1778878379384-003ob731wuirm.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:53:01.346097+00', '2026-05-15 20:53:01.346097+00', '2026-05-15 20:53:01.346097+00', '{"eTag": "\"bd5e18e183ab6328aa8f015deee7b8b4\"", "size": 11891, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:53:02.000Z", "contentLength": 11891, "httpStatusCode": 200}', '0d97e9d4-e160-4c69-bab7-050d094e256a', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('4bff21f6-0836-4869-b106-3ee4cda364ac', 'salas', '1778878421482-783dpolf0ev.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:53:43.474131+00', '2026-05-15 20:53:43.474131+00', '2026-05-15 20:53:43.474131+00', '{"eTag": "\"519397964a2de0c59979b2777c0628eb\"", "size": 11361, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:53:44.000Z", "contentLength": 11361, "httpStatusCode": 200}', '9c424afb-265d-43cf-9640-1754cbfbad79', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('308c27ec-04e2-4781-8bfc-a5fc53f76a23', 'salas', '1778878457463-reosqkgp4ao.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:54:19.640236+00', '2026-05-15 20:54:19.640236+00', '2026-05-15 20:54:19.640236+00', '{"eTag": "\"8f40da3c714784b32036de1d8ea619c1\"", "size": 207540, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:54:20.000Z", "contentLength": 207540, "httpStatusCode": 200}', 'beae5613-3c7d-4373-a56f-4332cfa18ef2', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('591ffc76-1833-421a-8b68-9d5b9f2681a4', 'salas', '1778878491047-31hvs6kzrv.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:54:53.028193+00', '2026-05-15 20:54:53.028193+00', '2026-05-15 20:54:53.028193+00', '{"eTag": "\"faedd03e6c37b30bc1b41625b09d61ba\"", "size": 8373, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:54:53.000Z", "contentLength": 8373, "httpStatusCode": 200}', 'c99b0780-f834-4aa3-a75e-3470dcbe3174', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('4fb4048d-00bc-49ec-b063-52023834d229', 'salas', '1778878507903-ufeal350xh.jpeg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:55:09.898672+00', '2026-05-15 20:55:09.898672+00', '2026-05-15 20:55:09.898672+00', '{"eTag": "\"ace4c698062f77e14b3938473ede74fa\"", "size": 43421, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:55:10.000Z", "contentLength": 43421, "httpStatusCode": 200}', '656034aa-daf3-4af2-a7a1-716017ac6a3b', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('a55c8981-0e7a-459d-88b9-4f6ccb9d37f6', 'salas', '1778878561534-kvvab3obq4.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:56:03.707098+00', '2026-05-15 20:56:03.707098+00', '2026-05-15 20:56:03.707098+00', '{"eTag": "\"c5a9879bf97264d6b2a4874de345beb1\"", "size": 9247, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:56:04.000Z", "contentLength": 9247, "httpStatusCode": 200}', '87682abe-bae3-4ae8-92b5-0f2590e56bd8', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('9b9f14cc-3989-477c-bdb6-ce1dbb1ad79e', 'salas', '1778878401016-lpkz8hlkpt.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:53:22.975533+00', '2026-05-15 20:53:22.975533+00', '2026-05-15 20:53:22.975533+00', '{"eTag": "\"b62b3e2c3dac9a222441982c61b8e186\"", "size": 11649, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:53:23.000Z", "contentLength": 11649, "httpStatusCode": 200}', '2708d654-b5d9-40f6-928b-cffc9b1a4c11', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('bf516333-5055-4c02-bf0b-17546beba7a2', 'equipos', 'devoluciones/devolucion-1779439223959-u4ijtlxqzsb.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 08:40:25.510493+00', '2026-05-22 08:40:25.510493+00', '2026-05-22 08:40:25.510493+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T08:40:26.000Z", "contentLength": 36180, "httpStatusCode": 200}', '998acd38-8a48-493c-a863-93dc348ca4de', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('138da898-e92e-48fe-a3ee-c7050a3119c0', 'salas', '1778878431951-df7oa6w9fk.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:53:53.957026+00', '2026-05-15 20:53:53.957026+00', '2026-05-15 20:53:53.957026+00', '{"eTag": "\"4c32eb44d1adada1e5ad28759b60856f\"", "size": 10408, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:53:54.000Z", "contentLength": 10408, "httpStatusCode": 200}', 'fbb76ff9-56e9-4fef-ad56-359bc34b352c', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('5271203d-d7db-4744-88b1-f9b8269e5599', 'salas', '1778878442711-j4iqt3smwzl.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:54:04.648019+00', '2026-05-15 20:54:04.648019+00', '2026-05-15 20:54:04.648019+00', '{"eTag": "\"204036c1e58827b61173cb6e897e12bc\"", "size": 10589, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:54:05.000Z", "contentLength": 10589, "httpStatusCode": 200}', 'aad3ddf8-a4c2-4112-b53e-ed011ef4673d', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b0b7f09a-badb-4684-a24e-93473ab0dab6', 'equipos', '1779500547249-sfqbf52bkqs.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-23 01:42:29.555106+00', '2026-05-23 01:42:29.555106+00', '2026-05-23 01:42:29.555106+00', '{"eTag": "\"9d5e322c486807fa4782b0646ea9f684\"", "size": 6730, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-23T01:42:30.000Z", "contentLength": 6730, "httpStatusCode": 200}', '1ceb850e-2b98-412d-bf0a-110c84bdf750', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f3fc4f0d-1a63-47f1-99de-994e86af66a6', 'salas', '1778878471191-ilulkt9hzhq.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:54:33.965848+00', '2026-05-15 20:54:33.965848+00', '2026-05-15 20:54:33.965848+00', '{"eTag": "\"7d4e61f520c0ab0f8464762250e64f09\"", "size": 673309, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:54:34.000Z", "contentLength": 673309, "httpStatusCode": 200}', '1250bf1e-c762-43b9-8475-1b222dbbcee3', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('f75d05ff-c6b4-4062-b287-e32f8b6d0e59', 'salas', '1778878499119-zt6xj21gij.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:55:01.041793+00', '2026-05-15 20:55:01.041793+00', '2026-05-15 20:55:01.041793+00', '{"eTag": "\"f1b5a9811d22acce1d2c6f548e0d021c\"", "size": 8976, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:55:01.000Z", "contentLength": 8976, "httpStatusCode": 200}', '754f2af4-2967-4b69-83c9-5ae5ad167106', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('509c2d27-7dfc-4a91-817c-7ea5a4d64b14', 'equipos', '1779500611533-sxlq1l2jcbi.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-23 01:43:33.021946+00', '2026-05-23 01:43:33.021946+00', '2026-05-23 01:43:33.021946+00', '{"eTag": "\"fad5a10da9f6b98d9c00bf9886f236f1\"", "size": 10411, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-23T01:43:33.000Z", "contentLength": 10411, "httpStatusCode": 200}', '6ade75ba-8e84-4273-8764-ef7384c351b3', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('3c5caf37-7ffb-49f6-984b-301a764680f3', 'salas', '1778878533703-9wo5fveua5h.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:55:35.778585+00', '2026-05-15 20:55:35.778585+00', '2026-05-15 20:55:35.778585+00', '{"eTag": "\"d8eea7a9f7888e6b9542435d683fde5d\"", "size": 87478, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:55:36.000Z", "contentLength": 87478, "httpStatusCode": 200}', 'e35e8364-7fc7-48b8-aad8-63c8f769af9f', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('960067f0-0349-4cb3-b14d-6369d49d70a7', 'salas', '1778878570542-6omzbo3v1z.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 20:56:12.45521+00', '2026-05-15 20:56:12.45521+00', '2026-05-15 20:56:12.45521+00', '{"eTag": "\"b75053892e48998de4fbb5e02f793585\"", "size": 6194, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T20:56:13.000Z", "contentLength": 6194, "httpStatusCode": 200}', 'd773eedf-181c-435c-953d-e7281ed9f2eb', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('5fb5ea3b-7007-4964-b297-74986362623a', 'equipos', '1778879126506-h3qzjqz3fng.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-15 21:05:28.658516+00', '2026-05-15 21:05:28.658516+00', '2026-05-15 21:05:28.658516+00', '{"eTag": "\"7d2d55495aa9105b9a9d2502ea800258\"", "size": 5652, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-15T21:05:29.000Z", "contentLength": 5652, "httpStatusCode": 200}', '441b7baa-a51e-4760-af38-bbc1abaa5e13', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('d50194f0-ce27-4be1-a6e0-0bc4fd61ecad', 'salas', '1778890639305-qmzp4y764mq.jpeg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-16 00:17:23.914569+00', '2026-05-16 00:17:23.914569+00', '2026-05-16 00:17:23.914569+00', '{"eTag": "\"b9fbcc6b5bb62c84066a79208326513f\"", "size": 197354, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-16T00:17:24.000Z", "contentLength": 197354, "httpStatusCode": 200}', '05ead62e-b2d9-4f97-90c7-5a544ab6bc02', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('aa85e333-3743-4d23-b58d-c2123b5c14a1', 'equipos', 'devoluciones/devolucion-1779414675476-zavyzulrvw.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 01:51:17.098769+00', '2026-05-22 01:51:17.098769+00', '2026-05-22 01:51:17.098769+00', '{"eTag": "\"a2bf1a172f5c4dbda9d44237dddd5ad3\"", "size": 6398, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T01:51:18.000Z", "contentLength": 6398, "httpStatusCode": 200}', 'cef4ce1f-5942-4865-a9be-890dd5bb4ad4', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('b05e5cff-5610-4ba8-9de1-06f0bbfae351', 'equipos', 'devoluciones/devolucion-1779414681974-nvs2gohzo5.jpg', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 01:51:22.965187+00', '2026-05-22 01:51:22.965187+00', '2026-05-22 01:51:22.965187+00', '{"eTag": "\"a2bf1a172f5c4dbda9d44237dddd5ad3\"", "size": 6398, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T01:51:23.000Z", "contentLength": 6398, "httpStatusCode": 200}', '2ab18839-5c66-466e-a9a9-b0abf1ed2a14', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}'),
	('82e13343-6f64-4fe0-be32-da6ea2b25c29', 'equipos', 'devoluciones/devolucion-1779454310507-osqg64pcm4k.webp', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '2026-05-22 12:51:52.190644+00', '2026-05-22 12:51:52.190644+00', '2026-05-22 12:51:52.190644+00', '{"eTag": "\"583cbc30c71778a2686a822b96c3bbff\"", "size": 36180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T12:51:53.000Z", "contentLength": 36180, "httpStatusCode": 200}', '436b4c76-e1ee-4bf1-b848-3b5c4d419014', 'd59e97f3-278b-4ff5-98a1-fdf0f703f974', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 152, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict iWOLGlmCDqnVlyOahgjCHWL5ayGEhaEPCpzsbKgcaV684TW6dJjzjbYD9PUHAxn

RESET ALL;
