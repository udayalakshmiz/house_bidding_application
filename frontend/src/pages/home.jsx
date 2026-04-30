import { useEffect, useState } from "react"
import axios from "axios"

function Home() {
  const [message, setMessage] = useState("")

  useEffect(() => {
    axios.get("http://localhost:8081/test")
      .then(response => {
        setMessage(response.data)
      })
      .catch(error => {
        console.error("Error:", error)
      })
  }, [])

  return (
    <div>
      <h2>React Frontend</h2>
      <p>{message}</p>
    </div>
  )
}

export default Home