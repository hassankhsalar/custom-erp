First create a table named factory_to_store_transfer. This table will have the below columns:
product_id, production_id, store_id, quantity. (there can be multiple transfer for the same product from one production to the same store. so use id accordingly.  )
Then add a column to the production_material table named "scrap".
Then add 2 columns to the production_products table named "received" and "scrap". Both columns default value is 0.

See AllProductions.jsx from frontend directory. This file is showing all the production list. Now in the action field there is 3 options(edit, delete, show products). I want to change the "show products" option to be details. It will be good if I could use icons instead of texts. If there is any lightweight and popular icon package that includes all of the icons that we need like fontawesome use that package. So view/eye icon should work in this case. And it is only showing the products right now. I also want to show the materials as well. Also it will be great if we could show them in a popup instead of the table below the details.
Then I need a 4th option in the action column stating "change status". clicking this option will show a popup that holds current status in a select element and a submit button stating change. There are 4 statuses.
1. Pending
2. Running
3. Production Done
4. Partial Transfer
5. Transfer Done

1 and 2 can be changed normally.
If a user selects 3 (Production Done) then below the status field there will be a list of all the products and materials. The products table will contain: name, code, quantity, received, scrap, cost. Here only the quantity, received, scrap and cost field will be editable. by default the quantity will be set to received and the scrap field is 0.
The material table will have: name, quantity and scrap. Here only the scrap is editable. by default the scrap is set to 0. After giving the information user can change the status to "Production Done".

If user selects 4 (Partial Transfer) or 5 (Transfer Done) then there will be a table containig all the products of this production. The product list will contain the name, quantity, received, scrap, "moved to store" and action/transfer fields. If moved_to_store < received then this action will be shown. If clicked on the transfer then 2 input fields and a transfer/submit button will be shown in one single line for large screen. one is quantity and another is store. the stores will come from the backend. make sure to fetch once and use everytime. by default if moved_to_store < received then quantity = moved_to_store - received. Else the action field will be disable.

Now in the backend the file "productionRoutes.js" is responsible for the production routes. Feel free to create another route for the status change. Update the tables accordingly. Also insert/update to the factory_to_store_transfer table if the status is 4 or 5. make sure to update or create records carefully as there is partial transfer and products can go to different store from one production. Also you need to update the moved_to_store column of the production_products table.