import { useEffect, useState } from "react"
import axios from "axios"
import { SERVER_BASE_URL } from "../config/apiConfig"

function Home() {
  const [message, setMessage] = useState("")

  useEffect(() => {
    axios.get(`${SERVER_BASE_URL}/test`)
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