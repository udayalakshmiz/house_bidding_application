/**
 * Keep this in sync with your Spring Boot PropertyController.
 *
 * After you change upload / approval logic, only these need to match the backend:
 *
 * 1) useAdminRoutesForApproval
 *    - false: GET/PUT  /api/properties/pending, /api/properties/{id}/approve, ...
 *    - true:  GET/PUT  /api/admin/properties/pending, /api/admin/properties/{id}/approve, ...
 *
 * 2) multipartJsonPartName — must match @RequestPart("...") for the JSON part
 *    Common: "property" or "data"
 */
// Controls whether admin approval routes use /admin/properties or /properties
export const propertyApi = {
    useAdminRoutesForApproval: false
}