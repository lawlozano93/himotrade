-- List all functions with 'trade' in their name
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as argument_list,
    pg_get_function_result(p.oid) as return_type
FROM 
    pg_proc p
    LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    p.proname LIKE '%trade%' OR
    p.proname LIKE '%close%'
ORDER BY 
    n.nspname, 
    p.proname; 