const downloadTicket = (ticketData) => {
    const ticketContent = `
  ===============================
           BUS TICKET
  ===============================
  Ticket ID: ${ticketData.ticketId}
  Status: CONFIRMED
  
  Bus Information:
  • Bus: ${ticketData.busName}
  • Bus ID: ${ticketData.busId}
  • Direction: ${ticketData.direction}
  
  Journey Details:
  • From: ${ticketData.fromStation}
  • To: ${ticketData.toStation}
  • Distance: ${ticketData.distance} km
  
  Payment Information:
  • Passengers: ${ticketData.passengerCount || ticketData.count || 1}
  • Rate: ₹2 per km per passenger
  • Total Amount: ₹${ticketData.amount}
  
  Booking Details:
  • Booking Time: ${ticketData.bookingTime}
  • Payment Status: PAID
  
  ===============================
  IMPORTANT INSTRUCTIONS:
  • Show this ticket to conductor
  • Keep ticket until journey ends
  • Valid for single journey only
  ===============================
    `;
  
    const element = document.createElement('a');
    const file = new Blob([ticketContent], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = `bus-ticket-${ticketData.ticketId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };
  
  export default downloadTicket;