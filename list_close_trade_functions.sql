-- SQL query to list all functions named 'close_trade'
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as argument_list,
    pg_get_function_result(p.oid) as return_type
FROM 
    pg_proc p
    LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    p.proname = 'close_trade'
ORDER BY 
    n.nspname, 
    p.proname; 