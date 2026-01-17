CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`alertType` enum('threshold_breach','system','manual') NOT NULL,
	`boredomPercentage` float,
	`message` text,
	`delivered` boolean NOT NULL DEFAULT false,
	`deliveryChannels` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `engagementData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`totalFaces` int NOT NULL DEFAULT 0,
	`boredCount` int NOT NULL DEFAULT 0,
	`engagedCount` int NOT NULL DEFAULT 0,
	`neutralCount` int NOT NULL DEFAULT 0,
	`boredomPercentage` float NOT NULL DEFAULT 0,
	`averageEngagementScore` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engagementData_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faceAnalysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`faceIndex` int NOT NULL,
	`emotionLabel` varchar(50),
	`emotionConfidence` float NOT NULL DEFAULT 0,
	`headPoseX` float,
	`headPoseY` float,
	`headPoseZ` float,
	`isYawning` boolean DEFAULT false,
	`isLookingDown` boolean DEFAULT false,
	`engagementScore` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faceAnalysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enableVibration` boolean NOT NULL DEFAULT true,
	`enableSound` boolean NOT NULL DEFAULT true,
	`enableVisual` boolean NOT NULL DEFAULT true,
	`enableEmail` boolean NOT NULL DEFAULT false,
	`enablePush` boolean NOT NULL DEFAULT true,
	`soundType` varchar(50) DEFAULT 'default',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `sessionAssistants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionAssistants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`overallEngagement` float,
	`peakEngagementTime` timestamp,
	`lowestEngagementTime` timestamp,
	`insights` text,
	`recommendations` text,
	`successfulMoments` text,
	`improvementAreas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionReports_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessionReports_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speakerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('scheduled','live','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`alertThreshold` float NOT NULL DEFAULT 40,
	`startTime` timestamp,
	`endTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
