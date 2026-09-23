# Merge Report

Base: `btech 1.zip` (contains the Branch and Course Structure implementation that was tested).
Merged additions: missing modules/files from `CMS_BTech.zip`.

## Preserved
- Branch Management API implementation
- Course Structure API implementation
- Current BTech project and solution
- Existing common DTOs/models/repositories/services from the base project

## Added
- Section / Section Assignment modules
- Department extended services/repository
- Course Semester Mapping
- Subject Assignment
- Academic Level
- Change Password
- College User Mapping
- Additional database scripts and exception middleware
- Dapper and MySqlConnector package references required by imported repositories

## Fixes applied during merge
- Avoided duplicate controllers/types already present in the base project.
- Added the missing `CollegeUserMapping` model referenced by the source context/service.
- Combined the broader EF Core context with Course/Branch/CourseStructure mappings.
- Added DI registrations for imported repositories/services.
- Added exception middleware to the pipeline.

Note: The environment used to create this archive does not contain the .NET SDK, so a `dotnet build` could not be executed here. The source was merged structurally and generated `.vs/bin/obj` artifacts were excluded.
