# Backup and Restore Guide

## Purpose

This guide explains how backups are created and restored in ROMS.

## Backup schedule

- Daily automated backup runs at 02:00 Africa/Nairobi time.
- The backup includes:
  - PostgreSQL database dump
  - uploaded documents and media files
- Backups are stored locally and encrypted to Google Drive.

## Manual backup

1. Sign in as Super Admin.
2. Open Settings.
3. Click Back up to Google Drive.
4. Wait for the progress bar to finish.
5. Confirm the status message.

## Restore process

1. Sign in as Super Admin.
2. Open Settings.
3. Select the desired snapshot.
4. Type RESTORE ROMS.
5. Click Restore selected snapshot.
6. Wait for the system to complete the restore.

> Warning: restore replaces the live database and uploaded documents. This is a high-impact action. It should only be done by authorized admin staff.

## Recovery notes

- Keep the Google Drive recovery keys secure.
- Keep local copies of recent backups.
- Verify the backup before using it for restore.
- Make sure the application is not actively being used during a restore.

## Recommended backup practices

- review backups weekly
- confirm one snapshot is always available in Drive
- do not store recovery keys in public or shared documents
- keep admin access limited to trusted users
