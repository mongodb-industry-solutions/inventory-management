export const TALK_TRACK_MANUFACTURING = [
  {
    heading: "Overview",
    content: [
      {
        heading: "Solution Overview",
        body: "In the manufacturing industry, having the right inventory in the right place at the right time is essential. Poor inventory management can lead to operational disruptions and increased costs. This demo highlights how real-time inventory tracking and transaction processing enable businesses to maintain a single view of inventory across all production lines. As production begins and raw materials are consumed, inventory levels update instantly, allowing for automated or manual adjustments. This ensures smarter stock allocation, minimizes delays, and provides full visibility, helping businesses respond dynamically to demand fluctuations while optimizing operations.",
      },
      {
        image: {
          src: "/images/overview.svg",
          alt: "Solution Overview",
        },
      },
      {
        heading: "Why it matters in the industry?",
        body: "Modern manufacturing supply chains are complex, interconnected systems. Efficient supply chains can control operational costs and ensure on-time delivery to customers. Inventory optimization and management are key components in achieving these goals. While maintaining higher inventory levels allows suppliers to deal with unexpected fluctuations in demand, they come with higher inventory-holding costs that may be passed on to customers. Thus, every player in the supply chain is willing to strike a balance between inventory levels to maximize profitability and competitive advantage in the market. Effective inventory management mitigates the risk of the bullwhip effect, where sudden demands can disrupt the supply chain costs and performance.",
      },
    ],
  },
  {
    heading: "Behind the Scenes",
    content: [
      {
        heading: "Logical Architecture",
        body: "",
      },
      {
        image: {
          src: "/images/architecture.svg",
          alt: "Conceptual Architecture",
        },
      },
      {
        heading: " ",
        body: "At its core, the system operates with key collections that work together to provide a single view of inventory across warehouses and factories. We manage products, track dispatch events, generate orders for restocking, and maintain visibility and analytics across locations. What makes this system powerful is how these collections communicate in real time using an event-driven architecture. This means you don't have to manually check for updates-you will receive real-time notifications. Additionally, you can configure automated responses to inventory changes. These capabilities are made possible by MongoDB Atlas, leveraging:",
      },
      {
        heading: " ",
        body: [
          "MongoDB Change Streams allows you to subscribe to specific database changes and react in real time, enabling applications to immediately respond to updates, inserts, or deletions without manual polling.",
          "MongoDB Atlas Triggers execute server-side logic in response to database events or on a scheduled basis, enabling workflow automation without manual intervention. In inventory management, Triggers can automatically generate restock orders when stock levels drop, ensuring timely replenishment and seamless operations.",
          "Analytics for Smarter Decisions. To optimize inventory replenishment decisions, we leverage MongoDB Atlas Charts and the Aggregation Framework.",
        ],
      },
      {
        image: {
          src: "/images/highlevel-flow.svg",
          alt: "High-Level Flow",
        },
      },
      {
        heading: " ",
        body: "These tools allow us to analyze raw material consumption trends, inventory movements, and demand patterns in real time, enabling businesses to make data-driven decisions on when and how to restock efficiently. With real-time inventory visibility, automation, and analytics, this system ensures that businesses can react instantly to changes, maintain accurate stock levels, and optimize supply chain operations.",
      },
    ],
  },
  {
    heading: "How to Demo",
    content: [
      {
        heading: "Step by Step Guide",
        body: (
          <>
            This demo is designed to showcase how inventory processes react
            automatically and in real-time, making it ideal to present with two
            screens. The main screen should be visible to the audience, while
            you will take the initial control from the{" "}
            <a href="/control">Control Panel</a> (accessible via the gear icon
            in the user profile menu). This setup ensures a smooth experience,
            keeping the demo focused on real-time updates while you manage the
            flow in the background.
          </>
        ),
      },
      {
        heading: " ",
        body: [
          'Simulate the start of operations of a factory, enabling dispatch events across different locations using the "Start Production" button in the control panel. You can also start fresh with all stock at ideal levels by using the "Reset All" button in the control panel.',
          "Monitor real-time transactions in the Analytics View to make informed decisions or configure automated processes based on real-time data.",
          "Access a single view of your inventoryand receive low-stock alerts, allowing you to configure auto-replenishment or place manual orders to keep stock levels optimized.",
          "Review and filter orders in the Orders View.",
          "Review and filter sales events in the Dispatch Events View.",
          "Interact with stock levels and real-time notifications using the Control Panel, while your audience watches a single view inventory in the Real-time Invetory View respond dynamically to stock adjustments and configurations in real time.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "Easy",
        body: "The document model mirrors the way developers think, making data modeling intuitive and adaptable for evolving inventory needs.",
      },
      {
        heading: "Fast",
        body: "Its intuitive structure makes development faster and easier, improving time to market not just with simple queries, but also by enabling innovation-for example, seamlessly integrating Change Streams and Triggers for real-time updates and automation.",
      },
      {
        heading: "Superior Architecture ",
        body: "Workload Isolation ensures operational queries and analytics run efficiently without impacting performance, keeping inventory visibility and business intelligence always up to date.",
      },
      {
        heading: " ",
        body: "With MongoDB's flexible document model, real-time processing, and workload isolation, businesses can maintain a single, up-to-date view of inventory, scale seamlessly, and drive innovation effortlessly.",
      },
    ],
  },
];

export const TALK_TRACK_RETAIL = [];
